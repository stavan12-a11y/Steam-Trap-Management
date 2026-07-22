import * as XLSX from 'xlsx';
import {
  CONNECTION_TYPES,
  DEFAULT_TRAP_DATASHEET,
  ORIENTATIONS,
  TRAP_TYPES,
  type AppData,
  type Equipment,
  type Trap,
} from '../types';
import { DATA_VERSION } from '../data/seedData';
import { uid } from './id';
import { downloadExcel, type ExportSheet } from './export';

/**
 * Canonical upload columns — order matches the field survey list:
 * Area → Equipment → Trap ID → Location → Orientation → Line Pressure →
 * Trap Model → Size (inch) → Trap Connection → Trap Type → Manufacturer
 *
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
    ],
  ];
}

function buildInstructionsSheet(): ExportSheet {
  return {
    name: 'Instructions',
    headers: ['Field', 'Required', 'Notes'],
    rows: [
      ['Area', 'No', 'Shown on the equipment faceplate. Used when creating new equipment; ignored if that equipment already exists.'],
      ['Equipment', 'Yes', 'Equipment name this trap belongs to. New equipment is created automatically if the name is new.'],
      ['Trap ID', 'Yes', 'Unique trap identifier (e.g. ST-1001). Duplicate IDs update existing traps in Merge mode.'],
      ['Location', 'No', 'Physical location of the trap. Defaults to "Unspecified" if blank.'],
      ['Orientation', 'No', 'Free text (e.g. Horizontal, Vertical). Any value is accepted.'],
      ['Line Pressure', 'No', 'Free text (e.g. 150 psig).'],
      ['Trap Model', 'No', 'Free text manufacturer model number.'],
      ['Size (inch)', 'No', 'Free text size in inches (e.g. 1/2, 3/4, 1).'],
      ['Trap Connection', 'No', 'Free text (e.g. NPT Threaded, Flanged). Any value is accepted.'],
      ['Trap Type', 'Yes', 'Free text — any type is accepted (e.g. Bucket, Inverted Bucket, Float & Thermostatic, Thermodynamic).'],
      ['Manufacturer', 'No', 'Free text trap manufacturer.'],
      ['', '', ''],
      ['How to use', '', '1) Fill rows on the Traps sheet (replace or keep the example rows). 2) Save the file. 3) On the dashboard, click Import data… and upload this workbook.'],
      ['Merge mode', '', 'Adds new traps and updates existing traps that share the same Trap ID. Existing equipment is reused by name.'],
      ['Replace mode', '', 'Clears all current equipment, traps, and history, then imports only what is in this file.'],
      ['Validation', '', 'No restricted lists. Only Trap ID, Equipment, and Trap Type are required (non-blank). All other fields accept any text.'],
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
      orientation: row.orientation,
      line_pressure: row.line_pressure,
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
