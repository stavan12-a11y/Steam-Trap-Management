import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useSteamTrap } from '../store/SteamTrapContext';
import { equipmentRollups } from '../utils/logic';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { EquipmentFormModal } from '../components/forms/EquipmentFormModal';

export function EquipmentListPage() {
  const { data, deleteEquipment } = useSteamTrap();
  const rollups = useMemo(() => equipmentRollups(data), [data]);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Equipment' }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Equipment</h2>
          <p className="text-sm text-slate-500">Monitored assets and their steam trap inventories.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Add Equipment
        </button>
      </div>

      <div className="card overflow-hidden">
        {rollups.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No equipment yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Asset</th>
                  <th className="px-4 py-2.5">Area</th>
                  <th className="px-4 py-2.5 text-right">Traps</th>
                  <th className="px-4 py-2.5 text-right">Issues</th>
                  <th className="px-4 py-2.5 text-right">Overdue</th>
                  <th className="px-4 py-2.5 text-right">Eng. Review</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rollups.map((eq) => (
                  <tr key={eq.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link to={`/equipment/${eq.id}`} className="font-semibold text-maroon-800 hover:underline">
                        {eq.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{eq.area}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{eq.trap_count}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-red-600">{eq.issue_count}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-amber-600">{eq.overdue_count}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-violet-600">
                      {eq.engineering_review_count}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        className="text-xs font-semibold text-red-600 hover:underline"
                        onClick={() => {
                          if (confirm(`Delete ${eq.name}?`)) deleteEquipment(eq.id);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EquipmentFormModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
