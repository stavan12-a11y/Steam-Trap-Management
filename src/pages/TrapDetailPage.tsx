import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ClipboardCheck } from 'lucide-react';
import { useSteamTrap } from '../store/SteamTrapContext';
import { buildTrapView, recordsForTrap } from '../utils/logic';
import { dueLabel } from '../utils/format';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { PriorityBadge, RunningBadge, StatusBadge } from '../components/Badges';
import { PMFormModal } from '../components/forms/PMFormModal';

export function TrapDetailPage() {
  const { trapId } = useParams<{ trapId: string }>();
  const navigate = useNavigate();
  const { data, getTrap, deleteTrap } = useSteamTrap();
  const trap = trapId ? getTrap(trapId) : undefined;
  const equipment = trap ? data.equipment.find((e) => e.id === trap.equipment_id) : undefined;
  const view = useMemo(() => {
    if (!trap || !equipment) return null;
    return buildTrapView(data, trap, equipment);
  }, [data, trap, equipment]);
  const records = useMemo(() => (trapId ? recordsForTrap(data, trapId) : []), [data, trapId]);
  const [pmOpen, setPmOpen] = useState(false);

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
          <button
            className="btn-primary"
            disabled={!view.equipment_running}
            onClick={() => setPmOpen(true)}
          >
            <ClipboardCheck className="h-4 w-4" />
            Record PM
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

      {!view.equipment_running && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <strong>{view.equipment_name} is stopped.</strong> PM entry is disabled until the
            parent equipment is running.
          </p>
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
            <dd className="flex flex-wrap items-center gap-2">
              <Link to={`/equipment/${view.equipment_id}`} className="text-maroon-800 hover:underline">
                {view.equipment_name}
              </Link>
              <RunningBadge running={view.equipment_running} />
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

      <PMFormModal open={pmOpen} onClose={() => setPmOpen(false)} trapId={view.id} />
    </div>
  );
}
