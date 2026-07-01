import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { useSteamTrap } from '../store/SteamTrapContext';
import {
  allTrapViews,
  computeKPIs,
  recordsForTrap,
  sortByPriority,
  todayISO,
} from '../utils/logic';
import { toCSV } from '../utils/csv';
import { Breadcrumbs } from '../components/Breadcrumbs';

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportingPage() {
  const { data } = useSteamTrap();
  const views = useMemo(() => sortByPriority(allTrapViews(data)), [data]);
  const kpis = useMemo(() => computeKPIs(views), [views]);

  const exportHistory = () => {
    const headers = [
      'PM Date', 'Trap Tag', 'Trap Type', 'Location', 'Equipment', 'Area',
      'Status', 'Issue Type', 'Technician', 'Notes',
    ];
    const eqById = new Map(data.equipment.map((e) => [e.id, e]));
    const rows: unknown[][] = [];
    for (const trap of [...data.traps].sort((a, b) => a.tag.localeCompare(b.tag))) {
      const eq = eqById.get(trap.equipment_id);
      for (const r of recordsForTrap(data, trap.id)) {
        rows.push([
          r.date, trap.tag, trap.type, trap.location, eq?.name ?? '', eq?.area ?? '',
          r.status, r.issue_type ?? '', r.technician, r.notes,
        ]);
      }
    }
    downloadCSV(`pm-history-${todayISO()}.csv`, toCSV(headers, rows));
  };

  const exportMaintenance = () => {
    const headers = [
      'Date', 'Trap Tag', 'Trap Type', 'Equipment', 'Action', 'Description',
      'Parts Replaced', 'Technician', 'Cost', 'Notes',
    ];
    const eqById = new Map(data.equipment.map((e) => [e.id, e]));
    const trapById = new Map(data.traps.map((t) => [t.id, t]));
    const rows: unknown[][] = [];
    for (const m of [...data.maintenance_records].sort((a, b) => b.date.localeCompare(a.date))) {
      const trap = trapById.get(m.trap_id);
      const eq = trap ? eqById.get(trap.equipment_id) : undefined;
      rows.push([
        m.date, trap?.tag ?? '', trap?.type ?? '', eq?.name ?? '',
        m.action, m.description, m.parts_replaced, m.technician,
        m.cost ?? '', m.notes,
      ]);
    }
    downloadCSV(`maintenance-history-${todayISO()}.csv`, toCSV(headers, rows));
  };

  const exportSnapshot = () => {
    const lines = [
      toCSV(['KPI', 'Value'], [
        ['Total Traps', kpis.total_traps],
        ['Active Issues', kpis.active_issues],
        ['Overdue PM', kpis.overdue_pm],
        ['Fleet Reliability %', kpis.fleet_reliability_rate],
        ['Generated', todayISO()],
      ]),
      '',
      toCSV(
        [
          'Trap Tag', 'Type', 'Location', 'Equipment', 'Area',
          'Priority', 'Status', 'Issue Type', 'Last PM Date', 'Next PM Date',
          'Days Until Due', 'PM Interval (days)', 'Failures (36 mo)', 'Smart Alerts',
        ],
        views.map((v) => [
          v.tag, v.type, v.location, v.equipment_name, v.equipment_area,
          v.priority, v.status ?? 'Never inspected',
          v.issue_type ?? '', v.last_pm_date ?? '', v.next_pm_date ?? '',
          v.days_until_due ?? '', v.pm_interval_days,
          v.failure_count_36mo,
          v.alerts.map((a) => a.label).join('; ') || 'None',
        ]),
      ),
    ];
    downloadCSV(`trap-snapshot-${todayISO()}.csv`, lines.join('\r\n'));
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Reporting' }]} />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Reporting</h2>
        <p className="text-sm text-slate-500">Export PM history, maintenance records, and fleet snapshots.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">PM History Export</h3>
          <p className="mt-2 text-sm text-slate-500">Full inspection history — one row per PM record.</p>
          <button className="btn-primary mt-4" onClick={exportHistory}>
            <Download className="h-4 w-4" />
            Download PM History (CSV)
          </button>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Maintenance Export</h3>
          <p className="mt-2 text-sm text-slate-500">Repairs, maintenance, and replacement records.</p>
          <button className="btn-primary mt-4" onClick={exportMaintenance}>
            <Download className="h-4 w-4" />
            Download Maintenance (CSV)
          </button>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Trap Snapshot Export</h3>
          <p className="mt-2 text-sm text-slate-500">Current KPIs plus every trap&apos;s computed state.</p>
          <button className="btn-primary mt-4" onClick={exportSnapshot}>
            <Download className="h-4 w-4" />
            Download KPIs + Snapshot (CSV)
          </button>
        </div>
      </div>
    </div>
  );
}
