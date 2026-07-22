import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useSteamTrap } from '../store/SteamTrapContext';
import { allTrapViews, sortByPriority } from '../utils/logic';
import { dueLabel } from '../utils/format';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { StatusBadge } from '../components/Badges';
import { TrapAlertBadges } from '../components/TrapAlerts';
import { TrapFormModal } from '../components/forms/TrapFormModal';

export function EquipmentPage() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const { data, getEquipment } = useSteamTrap();
  const equipment = equipmentId ? getEquipment(equipmentId) : undefined;
  const [showAddTrap, setShowAddTrap] = useState(false);

  const traps = useMemo(() => {
    if (!equipmentId) return [];
    return sortByPriority(allTrapViews(data).filter((v) => v.equipment_id === equipmentId));
  }, [data, equipmentId]);

  if (!equipment) {
    return (
      <div className="card p-10 text-center">
        <p className="font-semibold text-slate-600">Equipment not found</p>
        <Link to="/equipment" className="btn-primary mt-4 inline-flex">
          Back to Equipment
        </Link>
      </div>
    );
  }

  const issues = traps.filter((t) => t.status === 'Issue').length;
  const overdue = traps.filter((t) => t.priority === 'Overdue').length;
  const engReviews = traps.filter((t) => t.engineering_review_required).length;
  const smartAlerts = traps.filter((t) => t.alert_count > 0).length;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'Equipment', to: '/equipment' }, { label: equipment.name }]}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Equipment faceplate</p>
          <h2 className="text-2xl font-bold text-slate-900">{equipment.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-semibold text-slate-500">Area:</span> {equipment.area || '—'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddTrap(true)}>
          <Plus className="h-4 w-4" />
          Add Trap
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Traps', value: traps.length },
          { label: 'Issues', value: issues, cls: issues ? 'text-red-600' : '' },
          { label: 'Overdue', value: overdue, cls: overdue ? 'text-amber-600' : '' },
          { label: 'Eng. Review', value: engReviews, cls: engReviews ? 'text-violet-600' : '' },
          { label: 'Smart Alerts', value: smartAlerts, cls: smartAlerts ? 'text-orange-600' : '' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold text-slate-900 ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Trap Inventory</h3>
        </div>
        {traps.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No traps on this equipment yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Trap ID</th>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Orientation</th>
                  <th className="px-4 py-2.5">Line pressure</th>
                  <th className="px-4 py-2.5">Model</th>
                  <th className="px-4 py-2.5">Size</th>
                  <th className="px-4 py-2.5">Connection</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Manufacturer</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Next PM</th>
                  <th className="px-4 py-2.5 text-right">Due</th>
                </tr>
              </thead>
              <tbody>
                {traps.map((v) => (
                  <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link to={`/traps/${v.id}`} className="font-mono font-semibold text-maroon-800 hover:underline">
                        {v.tag}
                      </Link>
                      {v.alert_count > 0 && (
                        <span className="ml-2">
                          <TrapAlertBadges alerts={v.alerts} compact />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">{v.location}</td>
                    <td className="px-4 py-2.5">{v.orientation || '—'}</td>
                    <td className="px-4 py-2.5">{v.line_pressure || '—'}</td>
                    <td className="px-4 py-2.5">{v.model || '—'}</td>
                    <td className="px-4 py-2.5">{v.trap_size || '—'}</td>
                    <td className="px-4 py-2.5">{v.connection_type || '—'}</td>
                    <td className="px-4 py-2.5">{v.type}</td>
                    <td className="px-4 py-2.5">{v.manufacturer || '—'}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={v.status} issueType={v.issue_type} result={v.latest_result} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{v.next_pm_date ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right text-xs">{dueLabel(v.days_until_due, v.priority)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TrapFormModal
        open={showAddTrap}
        onClose={() => setShowAddTrap(false)}
        defaultEquipmentId={equipment.id}
      />
    </div>
  );
}
