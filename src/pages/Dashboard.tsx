import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useSteamTrap } from '../store/SteamTrapContext';
import { allTrapViews, computeKPIs, equipmentRollups } from '../utils/logic';
import { KPIGrid } from '../components/KPIGrid';
import { KPIChartsPanel } from '../components/KPIChartsPanel';
import { EquipmentCard } from '../components/EquipmentCard';
import { PriorityQueuePanel } from '../components/PriorityQueuePanel';
import { EquipmentFormModal } from '../components/forms/EquipmentFormModal';

export function Dashboard() {
  const { data } = useSteamTrap();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const kpis = useMemo(() => computeKPIs(allTrapViews(data)), [data]);
  const rollups = useMemo(() => equipmentRollups(data), [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Steam Trap Overview</h2>
          <p className="text-sm text-slate-500">
            Preventive maintenance status across all monitored equipment.
          </p>
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
    </div>
  );
}
