import { useMemo, useState } from 'react';
import { AlertTriangle, FileSpreadsheet, Plus, RotateCcw } from 'lucide-react';
import { isStaleData, useSteamTrap } from '../store/SteamTrapContext';
import { allTrapViews, computeKPIs, equipmentRollups, sortByPriority } from '../utils/logic';
import type { KPIClickKey } from '../utils/kpiFilters';
import { trapsForKpi } from '../utils/kpiFilters';
import { ExportOptionsModal } from '../components/ExportOptionsModal';
import { KPIGrid } from '../components/KPIGrid';
import { KPITrapListModal } from '../components/KPITrapListModal';
import { KPIChartsPanel } from '../components/KPIChartsPanel';
import { EquipmentCard } from '../components/EquipmentCard';
import { PriorityQueuePanel } from '../components/PriorityQueuePanel';
import { EquipmentFormModal } from '../components/forms/EquipmentFormModal';
import { DATA_VERSION } from '../data/seedData';

export function Dashboard() {
  const { data, resetToSeed } = useSteamTrap();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [kpiModalKey, setKpiModalKey] = useState<KPIClickKey | null>(null);

  const views = useMemo(() => sortByPriority(allTrapViews(data)), [data]);
  const kpis = useMemo(() => computeKPIs(views, data), [views, data]);
  const kpiTraps = useMemo(
    () => (kpiModalKey ? trapsForKpi(views, kpiModalKey, data) : []),
    [views, kpiModalKey, data],
  );
  const rollups = useMemo(() => equipmentRollups(data), [data]);
  const stale = isStaleData(data);

  return (
    <div className="space-y-6">
      {stale && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              <strong>Your data is from an older version (v{data.data_version ?? 1}).</strong> This app
              needs v{DATA_VERSION} for the latest KPIs and features. Click reset to load the current
              demo dataset.
            </p>
          </div>
          <button
            className="btn-primary shrink-0"
            onClick={() => {
              if (confirm('Reset to the latest demo dataset? Your current changes will be lost.')) {
                resetToSeed();
              }
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset demo data
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Steam Trap Overview</h2>
          <p className="text-sm text-slate-500">
            Preventive maintenance status across all monitored equipment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => setExportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4" />
            Export data…
          </button>
        </div>
      </div>

      <KPIGrid
        kpis={kpis}
        equipmentCount={data.equipment.length}
        onKpiClick={(key) => setKpiModalKey(key)}
      />

      <KPIChartsPanel />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900">Equipment</h3>
            <button className="btn-primary whitespace-nowrap" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" />
              Add Equipment
            </button>
          </div>

          {rollups.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="font-semibold text-slate-600">No equipment yet</p>
              <p className="mt-1 text-sm text-slate-400">
                Add your first piece of equipment to start tracking traps.
              </p>
              <button className="btn-primary mt-4 inline-flex" onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4" />
                Add Equipment
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {rollups.map((r) => (
                <EquipmentCard key={r.id} rollup={r} onEdit={() => setEditId(r.id)} />
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-1">
          <div className="h-[640px]">
            <PriorityQueuePanel />
          </div>
        </section>
      </div>

      <EquipmentFormModal open={showAdd} onClose={() => setShowAdd(false)} />
      <EquipmentFormModal
        open={editId !== null}
        equipmentId={editId ?? undefined}
        onClose={() => setEditId(null)}
      />
      <ExportOptionsModal open={exportOpen} onClose={() => setExportOpen(false)} data={data} />
      <KPITrapListModal
        open={kpiModalKey !== null}
        onClose={() => setKpiModalKey(null)}
        kpiKey={kpiModalKey}
        traps={kpiTraps}
      />
    </div>
  );
}
