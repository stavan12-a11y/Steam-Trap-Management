import * as XLSX from 'xlsx';
import {
  CONNECTION_TYPES,
  DEFAULT_TRAP_DATASHEET,
  ISSUE_TYPES,
  ORIENTATIONS,
  TRAP_TYPES,
  type AppData,
  type Equipment,
  type IssueType,
  type PMRecord,
  type Trap,
  type TrapStatus,
} from '../types';
import { DATA_VERSION } from '../data/seedData';
import { uid } from './id';
import { downloadExcel, type ExportSheet } from './export';

/**
 * Canonical upload columns:
 * Datasheet fields + optional one-time inspection history columns.
 * All values are free text — no enum restrictions on import.
 */
export const TRAP_TEMPLATE_HEADERS = [
  'Area',
  'Equipment',
  'Trap ID',
  'Location',
  'Orientation',
  'Line Pressure',
  'Trap Model',
  'Size (inch)',
  'Trap Connection',
  'Trap Type',
  'Manufacturer',
  'Inspection Date',
  'Inspection Result',
  'Inspection Notes',
] as const;

export type TrapTemplateHeader = (typeof TRAP_TEMPLATE_HEADERS)[number];

export interface TrapImportRow {
  tag: string;
  type: string;
  location: string;
  equipment_name: string;
  equipment_area: string;
  manufacturer: string;
  model: string;
  connection_type: string;
  trap_size: string;
  orientation: string;
  line_pressure: string;
  serial_number: string;
  install_date: string | null;
  inspection_date: string | null;
  inspection_result: string;
  inspection_notes: string;
  /** 1-based Excel row number for error messages. */
  rowNumber: number;
}

export interface ImportParseError {
  rowNumber: number;
  message: string;
}

export interface ParsedTrapImport {
  rows: TrapImportRow[];
  errors: ImportParseError[];
  warnings: ImportParseError[];
}

export type ImportMode = 'merge' | 'replace';

export interface ImportApplyResult {
  equipmentCreated: number;
  trapsCreated: number;
  trapsUpdated: number;
  trapsSkipped: number;
  inspectionsCreated: number;
}

const HEADER_ALIASES: Record<string, TrapTemplateHeader> = {
  area: 'Area',
  'equipment area': 'Area',
  equipment: 'Equipment',
  'equipment name': 'Equipment',
  'trap id': 'Trap ID',
  'trap tag': 'Trap ID',
  tag: 'Trap ID',
  location: 'Location',
  orientation: 'Orientation',
  'line pressure': 'Line Pressure',
  pressure: 'Line Pressure',
  'trap model': 'Trap Model',
  model: 'Trap Model',
  'size (inch)': 'Size (inch)',
  'size inch': 'Size (inch)',
  size: 'Size (inch)',
  'trap size': 'Size (inch)',
  'trap connection': 'Trap Connection',
  connection: 'Trap Connection',
  'connection type': 'Trap Connection',
  'trap type': 'Trap Type',
  type: 'Trap Type',
  manufacturer: 'Manufacturer',
  mfr: 'Manufacturer',
  'inspection date': 'Inspection Date',
  'pm date': 'Inspection Date',
  'last inspection date': 'Inspection Date',
  'inspection result': 'Inspection Result',
  result: 'Inspection Result',
  'pm result': 'Inspection Result',
  'inspection notes': 'Inspection Notes',
  notes: 'Inspection Notes',
  'pm notes': 'Inspection Notes',
};

function cellStr(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

function normalizeHeader(raw: unknown): TrapTemplateHeader | null {
  const key = cellStr(raw).toLowerCase().replace(/[_*]+/g, ' ').replace(/\s+/g, ' ').trim();
  return HEADER_ALIASES[key] ?? null;
}

/** Convert an Excel serial date (days since 1899-12-30) to YYYY-MM-DD. */
function excelSerialToISO(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1) return null;
  const whole = Math.floor(serial);
  const utc = Date.UTC(1899, 11, 30) + whole * 86400000;
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Accepts YYYY-MM-DD, MM/DD/YYYY, or Excel date serials. */
export function parseFlexibleDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const fromSSF =
      typeof XLSX.SSF?.parse_date_code === 'function'
        ? XLSX.SSF.parse_date_code(value)
        : null;
    if (fromSSF) {
      const y = String(fromSSF.y).padStart(4, '0');
      const m = String(fromSSF.m).padStart(2, '0');
      const d = String(fromSSF.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return excelSerialToISO(value);
  }

  const s = cellStr(value);
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, mm, dd, yyyy] = slash;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  const asDate = new Date(s);
  if (!Number.isNaN(asDate.getTime())) {
    return asDate.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Maps free-text inspection results onto Working/Issue for schedule/KPI logic.
 * Only explicitly "good" results count as Working — everything else is Issue.
 * The original free-text is always kept in `result` for Inspection History display.
 */
export function mapInspectionResult(result: string): {
  status: TrapStatus;
  issue_type: IssueType | null;
} {
  const raw = result.trim();
  if (!raw) return { status: 'Issue', issue_type: null };

  const lower = raw.toLowerCase();

  for (const it of ISSUE_TYPES) {
    if (it.toLowerCase() === lower) {
      return { status: 'Issue', issue_type: it };
    }
  }

  if (lower === 'issue') {
    return { status: 'Issue', issue_type: null };
  }

  // Explicitly good / working outcomes only.
  if (
    lower === 'working' ||
    /^(ok|okay|good|pass|passed|healthy|normal|satisfactory|acceptable|go)$/i.test(lower) ||
    /^(working|good condition|no issue|no issues|passed inspection)$/i.test(lower)
  ) {
    return { status: 'Working', issue_type: null };
  }

  if (/\b(working|ok|okay|good|pass(ed)?|healthy|satisfactory)\b/i.test(lower) &&
      !/\b(not|no|fail|issue|cold|block|blow|leak|bad)\b/i.test(lower)) {
    return { status: 'Working', issue_type: null };
  }

  // Any other free-text result (cold, blocked, leaking, needs repair, etc.) = not good.
  return { status: 'Issue', issue_type: null };
}

function exampleRows(): unknown[][] {
  return [
    [
      'Central Utility',
      'Boiler Plant 1',
      'ST-1001',
      'Boiler Room — Drip leg',
      'Horizontal',
      '150 psig',
      'FT-14',
      '3/4',
      'NPT Threaded',
      'Float & Thermostatic',
      'Spirax Sarco',
      '2026-03-15',
      'Working',
      'Ultrasonic check OK',
    ],
    [
      'Central Utility',
      'Boiler Plant 1',
      'ST-1002',
      'Header drip',
      'Vertical',
      '100 psig',
      'IB-15',
      '1',
      'Flanged',
      'Bucket',
      'Armstrong',
      '2026-02-20',
      'Cold trap — possible blocked',
      'Needs follow-up',
    ],
    [
      'Distribution',
      'Campus Loop North',
      'ST-2001',
      'Trace line — North',
      'Horizontal',
      '50 psig',
      'A3N',
      '1/2',
      'Socket Weld',
      'Thermodynamic',
      'TLV',
      '',
      '',
      '',
    ],
  ];
}

function buildInstructionsSheet(): ExportSheet {
  return {
    name: 'Instructions',
    headers: ['Field', 'Required', 'Notes'],
    rows: [
      ['Area', 'No', 'Shown on the equipment faceplate.'],
      ['Equipment', 'Yes', 'Equipment name. Created automatically if new.'],
      ['Trap ID', 'Yes', 'Unique trap identifier.'],
      ['Location', 'No', 'Physical location of the trap.'],
      ['Orientation', 'No', 'Free text.'],
      ['Line Pressure', 'No', 'Free text (e.g. 150 psig).'],
      ['Trap Model', 'No', 'Free text.'],
      ['Size (inch)', 'No', 'Free text.'],
      ['Trap Connection', 'No', 'Free text.'],
      ['Trap Type', 'Yes', 'Free text — any type accepted.'],
      ['Manufacturer', 'No', 'Free text.'],
      ['Inspection Date', 'No', 'Optional TLV survey date (YYYY-MM-DD or MM/DD/YYYY). Shown under Inspection History → TLV, not on the faceplate. Does not start the PM schedule.'],
      ['Inspection Result', 'No', 'Free text TLV result. Only clearly good results (Working, OK, Good, Pass, etc.) count as working for fleet reliability; all other results count as issues.'],
      ['Inspection Notes', 'No', 'Free-text notes shown in TLV Inspection History.'],
      ['', '', ''],
      ['How to use', '', 'Fill the Traps sheet, save, then Dashboard → Import data…'],
      ['Replace mode', '', 'Clears current data, then imports traps + any inspection rows.'],
      ['Validation', '', 'No restricted lists for types/results. Only Trap ID, Equipment, and Trap Type must be non-blank.'],
    ],
  };
}

function buildTrapsTemplateSheet(): ExportSheet {
  return {
    name: 'Traps',
    headers: [...TRAP_TEMPLATE_HEADERS],
    rows: exampleRows(),
  };
}

function buildReferenceSheet(): ExportSheet {
  const maxLen = Math.max(TRAP_TYPES.length, CONNECTION_TYPES.length, ORIENTATIONS.length);
  const rows: unknown[][] = [];
  for (let i = 0; i < maxLen; i++) {
    rows.push([TRAP_TYPES[i] ?? '', CONNECTION_TYPES[i] ?? '', ORIENTATIONS[i] ?? '']);
  }
  return {
    name: 'Examples',
    headers: ['Example Trap Types', 'Example Connections', 'Example Orientations'],
    rows: [['(Examples only — any text is accepted)', '', ''], ...rows],
  };
}

/** Downloads a blank Excel workbook users can fill and re-upload. */
export function downloadTrapImportTemplate() {
  downloadExcel('steam-trap-import-template.xlsx', [
    buildInstructionsSheet(),
    buildTrapsTemplateSheet(),
    buildReferenceSheet(),
  ]);
}

function sheetToMatrix(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: '',
    raw: true,
  });
}

function findTrapsSheet(wb: XLSX.WorkBook): XLSX.WorkSheet | null {
  const preferred = wb.SheetNames.find((n) => n.trim().toLowerCase() === 'traps');
  if (preferred) return wb.Sheets[preferred] ?? null;

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const matrix = sheetToMatrix(ws);
    const headerRow = matrix[0] ?? [];
    const mapped = headerRow.map(normalizeHeader).filter(Boolean);
    if (mapped.includes('Trap ID') && mapped.includes('Trap Type') && mapped.includes('Equipment')) {
      return ws;
    }
  }
  return wb.Sheets[wb.SheetNames[0]] ?? null;
}

/**
 * Parses an uploaded trap import workbook (.xlsx / .xls / .csv).
 * Values are free text — only blank required fields produce errors.
 */
export function parseTrapImportFile(buffer: ArrayBuffer, filename = ''): ParsedTrapImport {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const lowerName = filename.toLowerCase();

  let ws: XLSX.WorkSheet | null = null;
  if (lowerName.endsWith('.csv') && wb.SheetNames[0]) {
    ws = wb.Sheets[wb.SheetNames[0]] ?? null;
  } else {
    ws = findTrapsSheet(wb);
  }

  if (!ws) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, message: 'Could not find a worksheet with trap data.' }],
      warnings: [],
    };
  }

  const matrix = sheetToMatrix(ws);
  if (matrix.length === 0) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, message: 'The Traps sheet is empty.' }],
      warnings: [],
    };
  }

  const headerCells = matrix[0] ?? [];
  const colIndex = new Map<TrapTemplateHeader, number>();
  headerCells.forEach((cell, idx) => {
    const header = normalizeHeader(cell);
    if (header && !colIndex.has(header)) colIndex.set(header, idx);
  });

  const missingRequired = (['Trap ID', 'Trap Type', 'Equipment'] as const).filter(
    (h) => !colIndex.has(h),
  );
  if (missingRequired.length > 0) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          message: `Missing required column(s): ${missingRequired.join(', ')}. Download the template for the correct headers.`,
        },
      ],
      warnings: [],
    };
  }

  const get = (row: unknown[], header: TrapTemplateHeader): unknown => {
    const idx = colIndex.get(header);
    return idx === undefined ? '' : row[idx];
  };

  const rows: TrapImportRow[] = [];
  const errors: ImportParseError[] = [];
  const warnings: ImportParseError[] = [];
  const seenTags = new Map<string, number>();

  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i] ?? [];
    const rowNumber = i + 1;
    const isBlank = row.every((c) => cellStr(c) === '');
    if (isBlank) continue;

    const tag = cellStr(get(row, 'Trap ID'));
    const type = cellStr(get(row, 'Trap Type'));
    const equipmentName = cellStr(get(row, 'Equipment'));
    const location = cellStr(get(row, 'Location'));
    const equipmentArea = cellStr(get(row, 'Area'));
    const manufacturer = cellStr(get(row, 'Manufacturer'));
    const model = cellStr(get(row, 'Trap Model'));
    const connection_type = cellStr(get(row, 'Trap Connection'));
    const trapSize = cellStr(get(row, 'Size (inch)'));
    const orientation = cellStr(get(row, 'Orientation'));
    const linePressure = cellStr(get(row, 'Line Pressure'));
    const inspectionDateRaw = get(row, 'Inspection Date');
    const inspection_result = cellStr(get(row, 'Inspection Result'));
    const inspection_notes = cellStr(get(row, 'Inspection Notes'));

    if (!tag) {
      errors.push({ rowNumber, message: 'Trap ID is required.' });
      continue;
    }
    if (!equipmentName) {
      errors.push({ rowNumber, message: 'Equipment is required.' });
      continue;
    }
    if (!type) {
      errors.push({ rowNumber, message: 'Trap Type is required.' });
      continue;
    }

    let inspection_date = parseFlexibleDate(inspectionDateRaw);
    if (cellStr(inspectionDateRaw) && !inspection_date) {
      warnings.push({
        rowNumber,
        message: `Could not parse Inspection Date "${cellStr(inspectionDateRaw)}"; inspection will be skipped for this row.`,
      });
    }

    // If they provided result/notes but no date, warn and skip inspection only.
    if (!inspection_date && (inspection_result || inspection_notes)) {
      warnings.push({
        rowNumber,
        message: 'Inspection Result/Notes provided without Inspection Date; trap will import but no inspection history entry will be created.',
      });
    }

    const tagKey = tag.toLowerCase();
    if (seenTags.has(tagKey)) {
      warnings.push({
        rowNumber,
        message: `Duplicate Trap ID "${tag}" also appears on row ${seenTags.get(tagKey)}. The last row wins.`,
      });
    }
    seenTags.set(tagKey, rowNumber);

    const existingIdx = rows.findIndex((r) => r.tag.toLowerCase() === tagKey);
    const parsed: TrapImportRow = {
      tag,
      type,
      location: location || 'Unspecified',
      equipment_name: equipmentName,
      equipment_area: equipmentArea || 'Unspecified',
      manufacturer,
      model,
      connection_type,
      trap_size: trapSize,
      orientation,
      line_pressure: linePressure,
      serial_number: '',
      install_date: null,
      inspection_date,
      inspection_result,
      inspection_notes,
      rowNumber,
    };
    if (existingIdx >= 0) rows[existingIdx] = parsed;
    else rows.push(parsed);
  }

  return { rows, errors, warnings };
}

/**
 * Applies parsed trap rows onto an AppData snapshot.
 * Optional Inspection Date/Result/Notes create PM history entries.
 */
export function applyTrapImport(
  current: AppData,
  rows: TrapImportRow[],
  mode: ImportMode,
): { data: AppData; result: ImportApplyResult } {
  const base: AppData =
    mode === 'replace'
      ? {
          equipment: [],
          traps: [],
          pm_records: [],
          maintenance_records: [],
          shutdown_deferrals: [],
          engineering_reviews: [],
          kpi_snapshots: [],
          data_version: DATA_VERSION,
        }
      : {
          ...current,
          equipment: [...current.equipment],
          traps: [...current.traps],
          pm_records: [...current.pm_records],
          data_version: current.data_version ?? DATA_VERSION,
        };

  const equipmentByName = new Map<string, Equipment>();
  for (const eq of base.equipment) {
    equipmentByName.set(eq.name.trim().toLowerCase(), eq);
  }

  const trapByTag = new Map<string, Trap>();
  for (const t of base.traps) {
    trapByTag.set(t.tag.trim().toLowerCase(), t);
  }

  let equipmentCreated = 0;
  let trapsCreated = 0;
  let trapsUpdated = 0;
  let inspectionsCreated = 0;

  for (const row of rows) {
    const eqKey = row.equipment_name.trim().toLowerCase();
    let equipment = equipmentByName.get(eqKey);
    if (!equipment) {
      equipment = {
        id: uid('eq'),
        name: row.equipment_name.trim(),
        area: row.equipment_area.trim() || 'Unspecified',
      };
      base.equipment.push(equipment);
      equipmentByName.set(eqKey, equipment);
      equipmentCreated += 1;
    }

    const tagKey = row.tag.trim().toLowerCase();
    const existing = trapByTag.get(tagKey);
    const payload: Omit<Trap, 'id'> = {
      ...DEFAULT_TRAP_DATASHEET,
      tag: row.tag.trim(),
      type: row.type,
      location: row.location,
      equipment_id: equipment.id,
      manufacturer: row.manufacturer,
      model: row.model,
      connection_type: row.connection_type,
      trap_size: row.trap_size,
      orientation: row.orientation,
      line_pressure: row.line_pressure,
      serial_number: row.serial_number,
      install_date: row.install_date,
    };

    let trapId: string;
    if (existing) {
      const updated: Trap = { ...existing, ...payload, id: existing.id };
      const idx = base.traps.findIndex((t) => t.id === existing.id);
      if (idx >= 0) base.traps[idx] = updated;
      trapByTag.set(tagKey, updated);
      trapsUpdated += 1;
      trapId = existing.id;
    } else {
      const created: Trap = { ...payload, id: uid('tr') };
      base.traps.push(created);
      trapByTag.set(tagKey, created);
      trapsCreated += 1;
      trapId = created.id;
    }

    if (row.inspection_date) {
      const already = base.pm_records.some(
        (r) => r.trap_id === trapId && r.date === row.inspection_date,
      );
      if (!already) {
        const mapped = mapInspectionResult(row.inspection_result);
        const record: PMRecord = {
          id: uid('pm'),
          trap_id: trapId,
          date: row.inspection_date,
          status: mapped.status,
          issue_type: mapped.issue_type,
          result: row.inspection_result.trim(),
          source: 'tlv',
          technician: 'TLV',
          notes: row.inspection_notes.trim(),
          created_at: new Date().toISOString(),
        };
        base.pm_records.push(record);
        inspectionsCreated += 1;
      }
    }
  }

  return {
    data: base,
    result: {
      equipmentCreated,
      trapsCreated,
      trapsUpdated,
      trapsSkipped: 0,
      inspectionsCreated,
    },
  };
}
