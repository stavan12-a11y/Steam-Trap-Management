import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ClipboardCheck, Pencil, Plus, Wrench } from 'lucide-react';
import { useSteamTrap } from '../store/SteamTrapContext';
import type { PMRecord, ShutdownDeferral } from '../types';
import {
  PM_INTERVAL_DAYS,
  buildTrapView,
  maintenanceForTrap,
  recordsForTrap,
  shutdownDeferralsForTrap,
} from '../utils/logic';
import { dueLabel } from '../utils/format';
import { Breadcrumbs } from '../components/Breadcrumbs';
import {
  MaintenanceActionBadge,
  PriorityBadge,
  ShutdownDeferralBadge,
  StatusBadge,
} from '../components/Badges';
import { TrapAlertBadges, TrapAlertBanner } from '../components/TrapAlerts';
import { TrapFormModal } from '../components/forms/TrapFormModal';
import { PMFormModal } from '../components/forms/PMFormModal';
import { MaintenanceFormModal } from '../components/forms/MaintenanceFormModal';

function displayValue(value: string | null | undefined): string {
  return value?.trim() ? value : '—';
}

type HistoryEntry =
  | { kind: 'pm'; date: string; created_at: string; record: PMRecord }
  | { kind: 'shutdown'; date: string; created_at: string; record: ShutdownDeferral };

function mergeHistory(pm: PMRecord[], shutdown: ShutdownDeferral[]): HistoryEntry[] {
  return [
    ...pm.map((record) => ({ kind: 'pm' as const, date: record.date, created_at: record.created_at, record })),
    ...shutdown.map((record) => ({
      kind: 'shutdown' as const,
      date: record.recorded_date,
      created_at: record.created_at,
      record,
    })),
  ].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.created_at < b.created_at ? 1 : -1;
  });
}

export function TrapDetailPage() {
  const { trapId } = useParams<{ trapId: string }>();
  const navigate = useNavigate();
  const { data, getTrap, deleteTrap, deletePM, deleteMaintenance, deleteShutdownDeferral } =
    useSteamTrap();
  const trap = trapId ? getTrap(trapId) : undefined;
  const equipment = trap ? data.equipment.find((e) => e.id === trap.equipment_id) : undefined;
  const view = useMemo(() => {
    if (!trap || !equipment) return null;
    return buildTrapView(data, trap, equipment);
  }, [data, trap, equipment]);
  const records = useMemo(() => (trapId ? recordsForTrap(data, trapId) : []), [data, trapId]);
  const maintenance = useMemo(() => (trapId ? maintenanceForTrap(data, trapId) : []), [data, trapId]);
  const shutdownDeferrals = useMemo(
    () => (trapId ? shutdownDeferralsForTrap(data, trapId) : []),
    [data, trapId],
  );
  const history = useMemo(
    () => mergeHistory(records, shutdownDeferrals),
    [records, shutdownDeferrals],
  );

  const [trapEditOpen, setTrapEditOpen] = useState(false);
  const [pmOpen, setPmOpen] = useState(false);
  const [editPmId, setEditPmId] = useState<string | undefined>();
  const [editDeferralId, setEditDeferralId] = useState<string | undefined>();
  const [mntOpen, setMntOpen] = useState(false);
  const [editMntId, setEditMntId] = useState<string | undefined>();

  const openPm = (recordId?: string, deferralId?: string) => {
    setEditPmId(recordId);
    setEditDeferralId(deferralId);
    setPmOpen(true);
  };

  const openMnt = (recordId?: string) => {
    setEditMntId(recordId);
    setMntOpen(true);
  };

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
          <TrapAlertBadges alerts={view.alerts} />
          <button className="btn-primary" onClick={() => openPm()}>
            <ClipboardCheck className="h-4 w-4" />
            Record PM
          </button>
          <button className="btn-secondary" onClick={() => openMnt()}>
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

      {view.alerts.map((alert) => (
        <TrapAlertBanner key={alert.type} alert={alert} />
      ))}

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            Trap Faceplate
          </h3>
          <div className="flex items-center gap-2">
            <StatusBadge status={view.status} issueType={view.issue_type} />
            <button className="btn-secondary text-xs" onClick={() => setTrapEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">
          <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-slate-500">Tag</dt>
            <dd className="font-semibold text-slate-900">{view.tag}</dd>
            <dt className="text-slate-500">Type</dt>
            <dd>{view.type}</dd>
            <dt className="text-slate-500">Location</dt>
            <dd>{view.location}</dd>
            <dt className="text-slate-500">Equipment</dt>
            <dd>
              <Link to={`/equipment/${view.equipment_id}`} className="text-maroon-800 hover:underline">
                {view.equipment_name}
              </Link>
              <span className="text-slate-400"> · {view.equipment_area}</span>
            </dd>
            <dt className="text-slate-500">Manufacturer</dt>
            <dd>{displayValue(view.manufacturer)}</dd>
            <dt className="text-slate-500">Model</dt>
            <dd>{displayValue(view.model)}</dd>
          </dl>
          <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-slate-500">Connection</dt>
            <dd>{displayValue(view.connection_type)}</dd>
            <dt className="text-slate-500">Trap size</dt>
            <dd>{displayValue(view.trap_size)}</dd>
            <dt className="text-slate-500">Serial number</dt>
            <dd className="font-mono text-xs">{displayValue(view.serial_number)}</dd>
            <dt className="text-slate-500">Install date</dt>
            <dd className="font-mono">{displayValue(view.install_date)}</dd>
            <dt className="text-slate-500">PM interval</dt>
            <dd>{PM_INTERVAL_DAYS} days (3 months)</dd>
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
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            Inspection History
          </h3>
          <span className="text-xs text-slate-400">{history.length} records</span>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">No inspections recorded yet.</p>
        ) : (
          <ul className="space-y-4 border-l-2 border-slate-200 pl-4">
            {history.map((entry) => {
              if (entry.kind === 'pm') {
                const r = entry.record;
                return (
                  <li key={r.id} className="relative">
                    <span
                      className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full ring-2 ring-white ${
                        r.status === 'Issue' ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold">{r.date}</span>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status} issueType={r.issue_type} />
                        <button
                          className="text-xs font-semibold text-slate-600 hover:underline"
                          onClick={() => openPm(r.id)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-xs font-semibold text-red-600 hover:underline"
                          onClick={() => {
                            if (confirm('Delete this PM record?')) deletePM(r.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Technician: {r.technician}</p>
                    {r.notes && <p className="mt-2 text-sm text-slate-700">{r.notes}</p>}
                  </li>
                );
              }

              const sd = entry.record;
              return (
                <li key={sd.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-sky-500 ring-2 ring-white" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{sd.recorded_date}</span>
                    <div className="flex items-center gap-2">
                      <ShutdownDeferralBadge />
                      <button
                        className="text-xs font-semibold text-slate-600 hover:underline"
                        onClick={() => openPm(undefined, sd.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs font-semibold text-red-600 hover:underline"
                        onClick={() => {
                          if (confirm('Delete this shutdown deferral?')) deleteShutdownDeferral(sd.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    PM due: <span className="font-mono">{sd.pm_due_date}</span> · Technician:{' '}
                    {sd.technician}
                  </p>
                  {sd.notes && <p className="mt-2 text-sm text-slate-700">{sd.notes}</p>}
                </li>
              );
            })}
          </ul>
        )}
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
          <button className="btn-secondary text-sm" onClick={() => openMnt()}>
            <Plus className="h-4 w-4" />
            Add record
          </button>
        </div>

        {maintenance.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
            <Wrench className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No maintenance records yet.</p>
            <button className="btn-primary mt-3 inline-flex text-sm" onClick={() => openMnt()}>
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="text-xs font-semibold text-slate-600 hover:underline"
                          onClick={() => openMnt(m.id)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-xs font-semibold text-red-600 hover:underline"
                          onClick={() => {
                            if (confirm('Delete this maintenance record?')) deleteMaintenance(m.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {view.priority === 'Issue' && view.alert_count === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            This trap has an active issue. Record maintenance or replacement once corrective action
            is complete.
          </p>
        </div>
      )}

      <TrapFormModal
        open={trapEditOpen}
        onClose={() => setTrapEditOpen(false)}
        trapId={view.id}
      />
      <PMFormModal
        open={pmOpen}
        onClose={() => {
          setPmOpen(false);
          setEditPmId(undefined);
          setEditDeferralId(undefined);
        }}
        trapId={view.id}
        recordId={editPmId}
        deferralId={editDeferralId}
      />
      <MaintenanceFormModal
        open={mntOpen}
        onClose={() => {
          setMntOpen(false);
          setEditMntId(undefined);
        }}
        trapId={view.id}
        recordId={editMntId}
      />
    </div>
  );
}
