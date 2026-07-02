import * as XLSX from 'xlsx';
import type { AppData } from '../types';
import { delta, sortedKPISnapshots } from './kpiSnapshots';
import {
  allTrapViews,
  maintenanceForTrap,
  recordsForTrap,
  shutdownDeferralsForTrap,
  sortByPriority,
  todayISO,
} from './logic';

export interface ExportSheet {
  name: string;
  headers: string[];
  rows: unknown[][];
}

export type ExportOptionKey =
  | 'fleet_reliability_history'
  | 'active_issues_history'
  | 'overdue_pm_history'
  | 'trap_register'
  | 'inspection_history'
  | 'maintenance_history';

export interface ExportOption {
  key: ExportOptionKey;
  label: string;
  description: string;
  historical?: boolean;
}

export const EXPORT_OPTIONS: ExportOption[] = [
  {
    key: 'fleet_reliability_history',
    label: 'Fleet Reliability History',
    description: 'Date-wise reliability % with day-over-day change',
    historical: true,
  },
  {
    key: 'active_issues_history',
    label: 'Active Issues History',
    description: 'Date-wise active issue counts and breakdown by type',
    historical: true,
  },
  {
    key: 'overdue_pm_history',
    label: 'Overdue PM History',
    description: 'Date-wise overdue PM counts and change vs prior snapshot',
    historical: true,
  },
  {
    key: 'trap_register',
    label: 'Trap Register',
    description: 'All traps with datasheet fields and current status',
  },
  {
    key: 'inspection_history',
    label: 'Inspection History',
    description: 'PM inspections and equipment shutdown deferrals',
  },
  {
    key: 'maintenance_history',
    label: 'Maintenance History',
    description: 'Repairs, maintenance, and replacement records',
  },
];

function eqMaps(data: AppData) {
  const eqById = new Map(data.equipment.map((e) => [e.id, e]));
  const trapById = new Map(data.traps.map((t) => [t.id, t]));
  return { eqById, trapById };
}

export function downloadExcel(filename: string, sheets: ExportSheet[]) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const safeName = sheet.name.replace(/[\\/*?:[\]]/g, '').slice(0, 31) || 'Sheet';
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }
  const out = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, out);
}

export function exportSheetExcel(sheet: ExportSheet, filename: string) {
  downloadExcel(filename, [sheet]);
}

export function buildInspectionSheet(data: AppData, trapId?: string): ExportSheet {
  const { eqById } = eqMaps(data);
  const traps = trapId
    ? data.traps.filter((t) => t.id === trapId)
    : [...data.traps].sort((a, b) => a.tag.localeCompare(b.tag));

  const headers = [
    'Record Type',
    'Date',
    'Trap Tag',
    'Trap Type',
    'Location',
    'Equipment',
    'Area',
    'Status',
    'Issue Type',
    'PM Due Date',
    'Technician',
    'Notes',
  ];

  const rows: unknown[][] = [];

  for (const trap of traps) {
    const eq = eqById.get(trap.equipment_id);
    for (const r of recordsForTrap(data, trap.id)) {
      rows.push([
        'PM Inspection',
        r.date,
        trap.tag,
        trap.type,
        trap.location,
        eq?.name ?? '',
        eq?.area ?? '',
        r.status,
        r.issue_type ?? '',
        '',
        r.technician,
        r.notes,
      ]);
    }
    for (const sd of shutdownDeferralsForTrap(data, trap.id)) {
      rows.push([
        'Equipment Shutdown',
        sd.recorded_date,
        trap.tag,
        trap.type,
        trap.location,
        eq?.name ?? '',
        eq?.area ?? '',
        'Deferred',
        '',
        sd.pm_due_date,
        sd.technician,
        sd.notes,
      ]);
    }
  }

  rows.sort((a, b) => String(b[1]).localeCompare(String(a[1])));

  return { name: 'Inspection History', headers, rows };
}

export function buildMaintenanceSheet(data: AppData, trapId?: string): ExportSheet {
  const { eqById, trapById } = eqMaps(data);
  const records = trapId
    ? maintenanceForTrap(data, trapId)
    : [...data.maintenance_records].sort((a, b) => b.date.localeCompare(a.date));

  const headers = [
    'Date',
    'Trap Tag',
    'Trap Type',
    'Location',
    'Equipment',
    'Area',
    'Action',
    'Description',
    'Parts Replaced',
    'Technician',
    'Cost (USD)',
    'Notes',
  ];

  const rows = records.map((m) => {
    const trap = trapById.get(m.trap_id);
    const eq = trap ? eqById.get(trap.equipment_id) : undefined;
    return [
      m.date,
      trap?.tag ?? '',
      trap?.type ?? '',
      trap?.location ?? '',
      eq?.name ?? '',
      eq?.area ?? '',
      m.action,
      m.description,
      m.parts_replaced,
      m.technician,
      m.cost ?? '',
      m.notes,
    ];
  });

  return { name: 'Maintenance History', headers, rows };
}

export function buildTrapRegisterSheet(data: AppData): ExportSheet {
  const views = sortByPriority(allTrapViews(data));
  const headers = [
    'Trap Tag',
    'Type',
    'Location',
    'Equipment',
    'Area',
    'Manufacturer',
    'Model',
    'Connection Type',
    'Trap Size',
    'Serial Number',
    'Install Date',
    'Priority',
    'Status',
    'Issue Type',
    'Last PM Date',
    'Next PM Date',
    'Days Until Due',
    'PM Interval (days)',
    'Failures (36 mo)',
    'Smart Alerts',
  ];

  const rows = views.map((v) => [
    v.tag,
    v.type,
    v.location,
    v.equipment_name,
    v.equipment_area,
    v.manufacturer,
    v.model,
    v.connection_type,
    v.trap_size,
    v.serial_number,
    v.install_date ?? '',
    v.priority,
    v.status ?? 'Never inspected',
    v.issue_type ?? '',
    v.last_pm_date ?? '',
    v.next_pm_date ?? '',
    v.days_until_due ?? '',
    v.pm_interval_days,
    v.failure_count_36mo,
    v.alerts.map((a) => a.label).join('; ') || 'None',
  ]);

  return { name: 'Trap Register', headers, rows };
}

export function buildFleetReliabilityHistorySheet(data: AppData): ExportSheet {
  const snapshots = sortedKPISnapshots(data);
  const headers = [
    'Date',
    'Total Traps',
    'Active Issues',
    'Fleet Reliability %',
    'Change vs Prior (%)',
    'Change vs Prior (Issues)',
  ];

  const rows = snapshots.map((s, i) => {
    const prev = i > 0 ? snapshots[i - 1] : undefined;
    return [
      s.date,
      s.total_traps,
      s.active_issues,
      s.fleet_reliability_rate,
      delta(s.fleet_reliability_rate, prev?.fleet_reliability_rate),
      delta(s.active_issues, prev?.active_issues),
    ];
  });

  return { name: 'Fleet Reliability History', headers, rows };
}

export function buildActiveIssuesHistorySheet(data: AppData): ExportSheet {
  const snapshots = sortedKPISnapshots(data);
  const headers = [
    'Date',
    'Active Issues',
    'Blowing',
    'Blocked',
    'Leak',
    'Cycling',
    'Change vs Prior',
  ];

  const rows = snapshots.map((s, i) => {
    const prev = i > 0 ? snapshots[i - 1] : undefined;
    return [
      s.date,
      s.active_issues,
      s.blowing_issues,
      s.blocked_issues,
      s.leak_issues,
      s.cycling_issues,
      delta(s.active_issues, prev?.active_issues),
    ];
  });

  return { name: 'Active Issues History', headers, rows };
}

export function buildOverduePMHistorySheet(data: AppData): ExportSheet {
  const snapshots = sortedKPISnapshots(data);
  const headers = ['Date', 'Overdue PM', 'Due Soon PM', 'Change vs Prior (Overdue)'];

  const rows = snapshots.map((s, i) => {
    const prev = i > 0 ? snapshots[i - 1] : undefined;
    return [s.date, s.overdue_pm, s.due_soon_pm, delta(s.overdue_pm, prev?.overdue_pm)];
  });

  return { name: 'Overdue PM History', headers, rows };
}

const SHEET_BUILDERS: Record<ExportOptionKey, (data: AppData) => ExportSheet> = {
  fleet_reliability_history: buildFleetReliabilityHistorySheet,
  active_issues_history: buildActiveIssuesHistorySheet,
  overdue_pm_history: buildOverduePMHistorySheet,
  trap_register: buildTrapRegisterSheet,
  inspection_history: (data) => buildInspectionSheet(data),
  maintenance_history: (data) => buildMaintenanceSheet(data),
};

export function buildSheetsFromOptions(data: AppData, options: ExportOptionKey[]): ExportSheet[] {
  return options.map((key) => SHEET_BUILDERS[key](data));
}

export function exportSelectedWorkbookExcel(data: AppData, options: ExportOptionKey[]) {
  if (options.length === 0) return;
  downloadExcel(`steam-trap-export-${todayISO()}.xlsx`, buildSheetsFromOptions(data, options));
}

export function buildFullWorkbookSheets(data: AppData): ExportSheet[] {
  return buildSheetsFromOptions(
    data,
    EXPORT_OPTIONS.map((o) => o.key),
  );
}

export function exportFullWorkbookExcel(data: AppData) {
  downloadExcel(`steam-trap-export-${todayISO()}.xlsx`, buildFullWorkbookSheets(data));
}

export function exportTrapWorkbookExcel(data: AppData, trapTag: string, trapId: string) {
  const safeTag = trapTag.replace(/[\\/*?:[\]]/g, '-');
  downloadExcel(`trap-${safeTag}-${todayISO()}.xlsx`, [
    buildInspectionSheet(data, trapId),
    buildMaintenanceSheet(data, trapId),
  ]);
}
