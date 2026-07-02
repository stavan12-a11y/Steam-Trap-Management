import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, FileSpreadsheet, Plus, RotateCcw, Table2 } from 'lucide-react';
import { isStaleData, useSteamTrap } from '../store/SteamTrapContext';
import { allTrapViews, computeKPIs, equipmentRollups } from '../utils/logic';
import { ExportOptionsModal } from '../components/ExportOptionsModal';
import { KPIGrid } from '../components/KPIGrid';
import { KPIChartsPanel } from '../components/KPIChartsPanel';
import { EquipmentCard } from '../components/EquipmentCard';
import { PriorityQueuePanel } from '../components/PriorityQueuePanel';
import { EquipmentFormModal } from '../components/forms/EquipmentFormModal';

export function Dashboard() {
  const { data, resetToSeed } = useSteamTrap();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const kpis = useMemo(() => computeKPIs(allTrapViews(data), data), [data]);
  const rollups = useMemo(() => equipmentRollups(data), [data]);
  const stale = isStaleData(data);

  return (
    <div className="space-y-6">
      {stale && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              <strong>Your data is from an older version.</strong> Charts, alerts, and KPIs need the
              updated demo dataset. Click reset to load the latest data.
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
          <Link to="/reporting" className="btn-secondary">
            <Table2 className="h-4 w-4" />
            Reporting
          </Link>
          <button type="button" className="btn-primary" onClick={() => setExportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4" />
            Export data…
          </button>
        </div>
      </div>

      <KPIGrid kpis={kpis} equipmentCount={data.equipment.length} />

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
    </div>
  );
}
