import * as XLSX from 'xlsx';
import type { AppData } from '../types';
import { toCSV } from './csv';
import {
  activeIssuesByType,
  allTrapViews,
  computeKPIs,
  issuesByEquipment,
  maintenanceForTrap,
  pmScheduleBreakdown,
  priorityBreakdown,
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

function eqMaps(data: AppData) {
  const eqById = new Map(data.equipment.map((e) => [e.id, e]));
  const trapById = new Map(data.traps.map((t) => [t.id, t]));
  return { eqById, trapById };
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

export function exportSheetCSV(sheet: ExportSheet, filename: string) {
  downloadCSV(filename, toCSV(sheet.headers, sheet.rows));
}

export function exportSheetExcel(sheet: ExportSheet, filename: string) {
  downloadExcel(filename, [sheet]);
}

export function buildKPISheet(data: AppData): ExportSheet {
  const views = allTrapViews(data);
  const kpis = computeKPIs(views);
  const pmSchedule = pmScheduleBreakdown(views);
  const priorities = priorityBreakdown(views);
  const issuesByType = activeIssuesByType(views);
  const equipmentIssues = issuesByEquipment(views);

  const rows: unknown[][] = [
    ['Total Traps', kpis.total_traps],
    ['Active Issues', kpis.active_issues],
    ['Overdue PM', kpis.overdue_pm],
    ['Fleet Reliability %', kpis.fleet_reliability_rate],
    ['Generated', todayISO()],
    [],
    ['PM Schedule', 'Count', 'Description'],
    ...pmSchedule.map((s) => [s.name, s.value, s.description]),
    [],
    ['Priority', 'Count'],
    ...priorities.map((p) => [p.name, p.value]),
    [],
    ['Issue Type', 'Active Count'],
    ...issuesByType.map((i) => [i.type, i.count]),
    [],
    ['Equipment', 'Active Issues', 'Trap Count'],
    ...equipmentIssues.map((e) => [e.equipment, e.issues, e.traps]),
  ];

  return { name: 'KPIs', headers: ['Metric', 'Value', 'Notes'], rows };
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

export function buildFullWorkbookSheets(data: AppData): ExportSheet[] {
  return [
    buildKPISheet(data),
    buildTrapRegisterSheet(data),
    buildInspectionSheet(data),
    buildMaintenanceSheet(data),
  ];
}

export function exportFullWorkbookCSV(data: AppData) {
  const sheets = buildFullWorkbookSheets(data);
  const parts = sheets.map((s) => `=== ${s.name} ===\r\n${toCSV(s.headers, s.rows)}`);
  downloadCSV(`steam-trap-export-${todayISO()}.csv`, parts.join('\r\n\r\n'));
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

export function exportTrapWorkbookCSV(data: AppData, trapTag: string, trapId: string) {
  const safeTag = trapTag.replace(/[\\/*?:[\]]/g, '-');
  const inspection = buildInspectionSheet(data, trapId);
  const maintenance = buildMaintenanceSheet(data, trapId);
  const content = [
    `=== ${inspection.name} ===\r\n${toCSV(inspection.headers, inspection.rows)}`,
    `=== ${maintenance.name} ===\r\n${toCSV(maintenance.headers, maintenance.rows)}`,
  ].join('\r\n\r\n');
  downloadCSV(`trap-${safeTag}-${todayISO()}.csv`, content);
}
