import * as XLSX from 'xlsx';
import {
  CONNECTION_TYPES,
  DEFAULT_TRAP_DATASHEET,
  TRAP_TYPES,
  type AppData,
  type Equipment,
  type Trap,
  type TrapTypeName,
} from '../types';
import { DATA_VERSION } from '../data/seedData';
import { uid } from './id';
import { downloadExcel, type ExportSheet } from './export';

/** Canonical column headers for the trap upload template (row 1 of the Traps sheet). */
export const TRAP_TEMPLATE_HEADERS = [
  'Trap Tag',
  'Type',
  'Location',
  'Equipment Name',
  'Equipment Area',
  'Manufacturer',
  'Model',
  'Connection Type',
  'Trap Size',
  'Serial Number',
  'Install Date',
] as const;

export type TrapTemplateHeader = (typeof TRAP_TEMPLATE_HEADERS)[number];

export interface TrapImportRow {
  tag: string;
  type: TrapTypeName;
  location: string;
  equipment_name: string;
  equipment_area: string;
  manufacturer: string;
  model: string;
  connection_type: string;
  trap_size: string;
  serial_number: string;
  install_date: string | null;
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
}

const HEADER_ALIASES: Record<string, TrapTemplateHeader> = {
  'trap tag': 'Trap Tag',
  tag: 'Trap Tag',
  'trap id': 'Trap Tag',
  type: 'Type',
  'trap type': 'Type',
  location: 'Location',
  'equipment name': 'Equipment Name',
  equipment: 'Equipment Name',
  'equipment area': 'Equipment Area',
  area: 'Equipment Area',
  manufacturer: 'Manufacturer',
  mfr: 'Manufacturer',
  model: 'Model',
  'connection type': 'Connection Type',
  connection: 'Connection Type',
  'trap size': 'Trap Size',
  size: 'Trap Size',
  'serial number': 'Serial Number',
  serial: 'Serial Number',
  'install date': 'Install Date',
  installed: 'Install Date',
};

function cellStr(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel date serials are handled separately; plain numbers stringify cleanly.
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

function normalizeType(raw: string): TrapTypeName | null {
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return null;
  const exact = TRAP_TYPES.find((t) => t.toLowerCase() === cleaned);
  if (exact) return exact;
  const compact = cleaned.replace(/[^a-z0-9]/g, '');
  return (
    TRAP_TYPES.find((t) => t.toLowerCase().replace(/[^a-z0-9]/g, '') === compact) ?? null
  );
}

function normalizeConnection(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return '';
  const exact = CONNECTION_TYPES.find((c) => c.toLowerCase() === cleaned.toLowerCase());
  return exact ?? cleaned;
}

/** Convert an Excel serial date (days since 1899-12-30) to YYYY-MM-DD. */
function excelSerialToISO(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1) return null;
  // Excel's leap-year bug: serials >= 60 are offset by one day vs the real calendar.
  const whole = Math.floor(serial);
  const utc = Date.UTC(1899, 11, 30) + whole * 86400000;
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Accepts YYYY-MM-DD, MM/DD/YYYY, or Excel date serials. */
export function parseInstallDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    // With cellDates:true SheetJS usually gives Date objects; fall back for raw serials.
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

function exampleRows(): unknown[][] {
  return [
    [
      'ST-1001',
      'Float & Thermostatic',
      'Boiler Room — Drip leg',
      'Boiler Plant 1',
      'Central Utility',
      'Spirax Sarco',
      'FT-14',
      'NPT Threaded',
      '3/4"',
      'SS-2020-1001',
      '2020-03-15',
    ],
    [
      'ST-1002',
      'Inverted Bucket',
      'Header drip',
      'Boiler Plant 1',
      'Central Utility',
      'Armstrong',
      'IB-15',
      'Flanged',
      '1"',
      'AR-2019-2204',
      '2019-11-02',
    ],
    [
      'ST-2001',
      'Thermodynamic',
      'Trace line — North',
      'Campus Loop North',
      'Distribution',
      'TLV',
      'A3N',
      'Socket Weld',
      '1/2"',
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
      ['Trap Tag', 'Yes', 'Unique identifier for the trap (e.g. ST-1001). Duplicate tags update existing traps in Merge mode.'],
      ['Type', 'Yes', `One of: ${TRAP_TYPES.join('; ')}`],
      ['Location', 'No', 'Physical location description. Defaults to "Unspecified" if blank.'],
      ['Equipment Name', 'Yes', 'Equipment this trap belongs to. New equipment is created automatically if the name is new.'],
      ['Equipment Area', 'No', 'Area/building for the equipment. Used when creating new equipment; ignored if equipment already exists.'],
      ['Manufacturer', 'No', 'Trap manufacturer (datasheet).'],
      ['Model', 'No', 'Trap model (datasheet).'],
      ['Connection Type', 'No', `Preferred values: ${CONNECTION_TYPES.join('; ')}. Other values are accepted as free text.`],
      ['Trap Size', 'No', 'e.g. 1/2", 3/4", 1"'],
      ['Serial Number', 'No', 'Manufacturer serial number.'],
      ['Install Date', 'No', 'Use YYYY-MM-DD (preferred) or MM/DD/YYYY.'],
      ['', '', ''],
      ['How to use', '', '1) Fill rows on the Traps sheet (delete the example rows or keep them). 2) Save the file. 3) On the dashboard, click Import data… and upload this workbook.'],
      ['Merge mode', '', 'Adds new traps and updates existing traps that share the same Trap Tag. Existing equipment is reused by name.'],
      ['Replace mode', '', 'Clears all current equipment, traps, and history, then imports only what is in this file.'],
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
  const maxLen = Math.max(TRAP_TYPES.length, CONNECTION_TYPES.length);
  const rows: unknown[][] = [];
  for (let i = 0; i < maxLen; i++) {
    rows.push([TRAP_TYPES[i] ?? '', CONNECTION_TYPES[i] ?? '']);
  }
  return {
    name: 'Allowed Values',
    headers: ['Trap Types', 'Connection Types'],
    rows,
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

  // Fall back to the first sheet that looks like it has our headers.
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const matrix = sheetToMatrix(ws);
    const headerRow = matrix[0] ?? [];
    const mapped = headerRow.map(normalizeHeader).filter(Boolean);
    if (mapped.includes('Trap Tag') && mapped.includes('Type') && mapped.includes('Equipment Name')) {
      return ws;
    }
  }
  return wb.Sheets[wb.SheetNames[0]] ?? null;
}

/**
 * Parses an uploaded trap import workbook (.xlsx / .xls / .csv).
 * Returns validated rows plus per-row errors (invalid rows are excluded from `rows`).
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

  const missingRequired = (['Trap Tag', 'Type', 'Equipment Name'] as const).filter(
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

    const tag = cellStr(get(row, 'Trap Tag'));
    const typeRaw = cellStr(get(row, 'Type'));
    const equipmentName = cellStr(get(row, 'Equipment Name'));
    const location = cellStr(get(row, 'Location'));
    const equipmentArea = cellStr(get(row, 'Equipment Area'));
    const manufacturer = cellStr(get(row, 'Manufacturer'));
    const model = cellStr(get(row, 'Model'));
    const connectionRaw = cellStr(get(row, 'Connection Type'));
    const trapSize = cellStr(get(row, 'Trap Size'));
    const serialNumber = cellStr(get(row, 'Serial Number'));
    const installRaw = get(row, 'Install Date');

    if (!tag) {
      errors.push({ rowNumber, message: 'Trap Tag is required.' });
      continue;
    }
    if (!equipmentName) {
      errors.push({ rowNumber, message: 'Equipment Name is required.' });
      continue;
    }

    const type = normalizeType(typeRaw);
    if (!type) {
      errors.push({
        rowNumber,
        message: `Invalid Type "${typeRaw}". Use one of: ${TRAP_TYPES.join(', ')}.`,
      });
      continue;
    }

    const installDate = parseInstallDate(installRaw);
    if (cellStr(installRaw) && !installDate) {
      warnings.push({
        rowNumber,
        message: `Could not parse Install Date "${cellStr(installRaw)}"; leaving blank.`,
      });
    }

    const tagKey = tag.toLowerCase();
    if (seenTags.has(tagKey)) {
      warnings.push({
        rowNumber,
        message: `Duplicate Trap Tag "${tag}" also appears on row ${seenTags.get(tagKey)}. The last row wins.`,
      });
    }
    seenTags.set(tagKey, rowNumber);

    const connection_type = normalizeConnection(connectionRaw);
    if (
      connectionRaw &&
      !CONNECTION_TYPES.some((c) => c.toLowerCase() === connectionRaw.toLowerCase())
    ) {
      warnings.push({
        rowNumber,
        message: `Connection Type "${connectionRaw}" is not in the preferred list; it will still be imported.`,
      });
    }

    // Later duplicate tags overwrite earlier ones in the parsed list.
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
      serial_number: serialNumber,
      install_date: installDate,
      rowNumber,
    };
    if (existingIdx >= 0) rows[existingIdx] = parsed;
    else rows.push(parsed);
  }

  return { rows, errors, warnings };
}

/**
 * Applies parsed trap rows onto an AppData snapshot.
 * - merge: create/reuse equipment by name; create or update traps by tag
 * - replace: start from empty history and import only these traps
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
      serial_number: row.serial_number,
      install_date: row.install_date,
    };

    if (existing) {
      const updated: Trap = { ...existing, ...payload, id: existing.id };
      const idx = base.traps.findIndex((t) => t.id === existing.id);
      if (idx >= 0) base.traps[idx] = updated;
      trapByTag.set(tagKey, updated);
      trapsUpdated += 1;
    } else {
      const created: Trap = { ...payload, id: uid('tr') };
      base.traps.push(created);
      trapByTag.set(tagKey, created);
      trapsCreated += 1;
    }
  }

  return {
    data: base,
    result: {
      equipmentCreated,
      trapsCreated,
      trapsUpdated,
      trapsSkipped: 0,
    },
  };
}
