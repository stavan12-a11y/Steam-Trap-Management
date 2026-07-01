import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ClipboardCheck, FlaskConical, Plus, Wrench } from 'lucide-react';
import { useSteamTrap } from '../store/SteamTrapContext';
import { buildTrapView, maintenanceForTrap, recordsForTrap } from '../utils/logic';
import { dueLabel } from '../utils/format';
import { Breadcrumbs } from '../components/Breadcrumbs';
import {
  EngineeringReviewBadge,
  MaintenanceActionBadge,
  PriorityBadge,
  StatusBadge,
} from '../components/Badges';
import { PMFormModal } from '../components/forms/PMFormModal';
import { MaintenanceFormModal } from '../components/forms/MaintenanceFormModal';

export function TrapDetailPage() {
  const { trapId } = useParams<{ trapId: string }>();
  const navigate = useNavigate();
  const { data, getTrap, deleteTrap, deleteMaintenance } = useSteamTrap();
  const trap = trapId ? getTrap(trapId) : undefined;
  const equipment = trap ? data.equipment.find((e) => e.id === trap.equipment_id) : undefined;
  const view = useMemo(() => {
    if (!trap || !equipment) return null;
    return buildTrapView(data, trap, equipment);
  }, [data, trap, equipment]);
  const records = useMemo(() => (trapId ? recordsForTrap(data, trapId) : []), [data, trapId]);
  const maintenance = useMemo(() => (trapId ? maintenanceForTrap(data, trapId) : []), [data, trapId]);
  const [pmOpen, setPmOpen] = useState(false);
  const [mntOpen, setMntOpen] = useState(false);

  if (!trap || !equipment || !view) {
    return (
      <div className="card p-10 text-center">
        <p className="font-semibold text-slate-600">Trap not found</p>
        <Link to="/traps" className="btn-primary mt-4 inline-flex">
          Back to Traps
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Traps', to: '/traps' }, { label: view.tag }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{view.tag}</h2>
          <p className="text-sm text-slate-500">{view.location}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={view.priority} />
          {view.engineering_review_required && <EngineeringReviewBadge />}
          <button className="btn-primary" onClick={() => setPmOpen(true)}>
            <ClipboardCheck className="h-4 w-4" />
            Record PM
          </button>
          <button className="btn-secondary" onClick={() => setMntOpen(true)}>
            <Wrench className="h-4 w-4" />
            Record Maintenance
          </button>
          <button
            className="btn-secondary text-red-700"
            onClick={() => {
              if (confirm(`Delete ${view.tag}?`)) {
                deleteTrap(view.id);
                navigate('/traps');
              }
            }}
          >
            Delete trap
          </button>
        </div>
      </div>

      {view.engineering_review_required && (
        <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Engineering review recommended</p>
            <p className="mt-0.5">{view.engineering_review_reason}</p>
            <p className="mt-1 text-xs text-violet-700">
              This trap has failed {view.failure_count_36mo} times in the last 36 months. Consider
              root-cause analysis, trap sizing review, or replacement.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Metadata</h3>
            <StatusBadge status={view.status} issueType={view.issue_type} />
          </div>
          <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-slate-500">Type</dt>
            <dd>{view.type}</dd>
            <dt className="text-slate-500">Equipment</dt>
            <dd>
              <Link to={`/equipment/${view.equipment_id}`} className="text-maroon-800 hover:underline">
                {view.equipment_name}
              </Link>
            </dd>
            <dt className="text-slate-500">PM Interval</dt>
            <dd>{view.pm_interval_days} days</dd>
            <dt className="text-slate-500">Last PM</dt>
            <dd className="font-mono">{view.last_pm_date ?? '—'}</dd>
            <dt className="text-slate-500">Next PM</dt>
            <dd>
              {view.next_pm_date
                ? `${view.next_pm_date} · ${dueLabel(view.days_until_due, view.priority)}`
                : '—'}
            </dd>
            <dt className="text-slate-500">Failures (36 mo)</dt>
            <dd className={view.failure_count_36mo >= 3 ? 'font-semibold text-violet-700' : ''}>
              {view.failure_count_36mo}
            </dd>
          </dl>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Inspection History</h3>
            <span className="text-xs text-slate-400">{records.length} records</span>
          </div>
          {records.length === 0 ? (
            <p className="text-sm text-slate-500">No inspections recorded yet.</p>
          ) : (
            <ul className="space-y-4 border-l-2 border-slate-200 pl-4">
              {records.map((r) => (
                <li key={r.id} className="relative">
                  <span
                    className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full ring-2 ring-white ${
                      r.status === 'Issue' ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{r.date}</span>
                    <StatusBadge status={r.status} issueType={r.issue_type} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Technician: {r.technician}</p>
                  {r.notes && <p className="mt-2 text-sm text-slate-700">{r.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Maintenance & Replacement History
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Repairs, preventive maintenance, and trap replacements
            </p>
          </div>
          <button className="btn-secondary text-sm" onClick={() => setMntOpen(true)}>
            <Plus className="h-4 w-4" />
            Add record
          </button>
        </div>

        {maintenance.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
            <Wrench className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No maintenance records yet.</p>
            <button className="btn-primary mt-3 inline-flex text-sm" onClick={() => setMntOpen(true)}>
              Record first maintenance
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Parts</th>
                  <th className="px-3 py-2">Technician</th>
                  <th className="px-3 py-2 text-right">Cost</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {maintenance.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="px-3 py-2.5 font-mono text-xs">{m.date}</td>
                    <td className="px-3 py-2.5">
                      <MaintenanceActionBadge action={m.action} />
                    </td>
                    <td className="px-3 py-2.5">
                      <p>{m.description}</p>
                      {m.notes && <p className="mt-0.5 text-xs text-slate-500">{m.notes}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{m.parts_replaced || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{m.technician}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {m.cost != null ? `$${m.cost.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        className="text-xs font-semibold text-red-600 hover:underline"
                        onClick={() => {
                          if (confirm('Delete this maintenance record?')) deleteMaintenance(m.id);
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

      {view.priority === 'Issue' && !view.engineering_review_required && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            This trap has an active issue. Record maintenance or replacement once corrective action
            is complete.
          </p>
        </div>
      )}

      <PMFormModal open={pmOpen} onClose={() => setPmOpen(false)} trapId={view.id} />
      <MaintenanceFormModal open={mntOpen} onClose={() => setMntOpen(false)} trapId={view.id} />
    </div>
  );
}
