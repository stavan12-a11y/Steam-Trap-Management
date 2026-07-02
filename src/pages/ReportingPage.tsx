import { useMemo, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useSteamTrap } from '../store/SteamTrapContext';
import { todayISO } from '../utils/logic';
import {
  buildInspectionSheet,
  buildKPISheet,
  buildMaintenanceSheet,
  buildTrapRegisterSheet,
  buildFleetReliabilityHistorySheet,
  buildActiveIssuesHistorySheet,
  exportFullWorkbookCSV,
  exportSheetCSV,
  exportSheetExcel,
} from '../utils/export';
import { ExportButtons } from '../components/ExportButtons';
import { ExportOptionsModal } from '../components/ExportOptionsModal';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { sortedKPISnapshots } from '../utils/kpiSnapshots';

export function ReportingPage() {
  const { data } = useSteamTrap();
  const date = useMemo(() => todayISO(), []);
  const [exportOpen, setExportOpen] = useState(false);
  const snapshotCount = sortedKPISnapshots(data).length;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Reporting' }]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reporting &amp; Export</h2>
          <p className="text-sm text-slate-500">
            Download inspection history, maintenance records, KPIs, and date-wise trend analytics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => exportFullWorkbookCSV(data)}>
            <FileSpreadsheet className="h-4 w-4" />
            Full export (CSV)
          </button>
          <button type="button" className="btn-primary" onClick={() => setExportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4" />
            Custom export…
          </button>
        </div>
      </div>

      <div className="card border-sky-200 bg-sky-50/50 p-4 text-sm text-sky-900">
        <p>
          <span className="font-semibold">{snapshotCount} KPI snapshots</span> are stored automatically
          each day the fleet data changes. Historical sheets (fleet reliability, active issues, PM
          schedule) use these snapshots so you can track improvement over time. Use{' '}
          <span className="font-semibold">Custom export</span> to pick exactly what to download.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Current KPIs</h3>
          <p className="mt-2 text-sm text-slate-500">
            Fleet KPIs, PM schedule breakdown, priorities, and issues by type/equipment as of today.
          </p>
          <ExportButtons
            onCSV={() => exportSheetCSV(buildKPISheet(data), `kpis-${date}.csv`)}
            onExcel={() => exportSheetExcel(buildKPISheet(data), `kpis-${date}.xlsx`)}
          />
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            Fleet Reliability History
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Date-wise reliability %, active issues, and change vs prior snapshot.
          </p>
          <ExportButtons
            onCSV={() =>
              exportSheetCSV(buildFleetReliabilityHistorySheet(data), `fleet-reliability-${date}.csv`)
            }
            onExcel={() =>
              exportSheetExcel(
                buildFleetReliabilityHistorySheet(data),
                `fleet-reliability-${date}.xlsx`,
              )
            }
          />
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            Active Issues History
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Date-wise active issue counts by type (blowing, blocked, leak, cycling).
          </p>
          <ExportButtons
            onCSV={() =>
              exportSheetCSV(buildActiveIssuesHistorySheet(data), `active-issues-${date}.csv`)
            }
            onExcel={() =>
              exportSheetExcel(buildActiveIssuesHistorySheet(data), `active-issues-${date}.xlsx`)
            }
          />
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Trap Register</h3>
          <p className="mt-2 text-sm text-slate-500">
            Every trap with datasheet info, current status, PM schedule, and smart alerts.
          </p>
          <ExportButtons
            onCSV={() => exportSheetCSV(buildTrapRegisterSheet(data), `trap-register-${date}.csv`)}
            onExcel={() =>
              exportSheetExcel(buildTrapRegisterSheet(data), `trap-register-${date}.xlsx`)
            }
          />
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            Inspection History
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            All PM inspections and equipment shutdown deferrals.
          </p>
          <ExportButtons
            onCSV={() =>
              exportSheetCSV(buildInspectionSheet(data), `inspection-history-${date}.csv`)
            }
            onExcel={() =>
              exportSheetExcel(buildInspectionSheet(data), `inspection-history-${date}.xlsx`)
            }
          />
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            Maintenance History
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Repairs, preventive maintenance, and trap replacement records.
          </p>
          <ExportButtons
            onCSV={() =>
              exportSheetCSV(buildMaintenanceSheet(data), `maintenance-history-${date}.csv`)
            }
            onExcel={() =>
              exportSheetExcel(buildMaintenanceSheet(data), `maintenance-history-${date}.xlsx`)
            }
          />
        </div>
      </div>

      <ExportOptionsModal open={exportOpen} onClose={() => setExportOpen(false)} data={data} />
    </div>
  );
}
