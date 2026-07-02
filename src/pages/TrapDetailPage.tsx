import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ClipboardCheck, FileSpreadsheet, Pencil, Plus, ShieldCheck, Wrench } from 'lucide-react';
import { useSteamTrap } from '../store/SteamTrapContext';
import type { PMRecord, ShutdownDeferral } from '../types';
import {
  PM_INTERVAL_DAYS,
  buildTrapView,
  engineeringReviewsForTrap,
  maintenanceForTrap,
  recordsForTrap,
  shutdownDeferralsForTrap,
} from '../utils/logic';
import { dueLabel } from '../utils/format';
import { Breadcrumbs } from '../components/Breadcrumbs';
import {
  EngineeringReviewOutcomeBadge,
  MaintenanceActionBadge,
  PriorityBadge,
  ShutdownDeferralBadge,
  StatusBadge,
} from '../components/Badges';
import { TrapAlertBadges, TrapAlertBanner } from '../components/TrapAlerts';
import { TrapFormModal } from '../components/forms/TrapFormModal';
import { PMFormModal } from '../components/forms/PMFormModal';
import { MaintenanceFormModal } from '../components/forms/MaintenanceFormModal';
import { EngineeringReviewFormModal } from '../components/forms/EngineeringReviewFormModal';
import { exportTrapWorkbookExcel } from '../utils/export';

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
  const { data, getTrap, deleteTrap, deletePM, deleteMaintenance, deleteShutdownDeferral, deleteEngineeringReview } =
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
  const engineeringReviews = useMemo(
    () => (trapId ? engineeringReviewsForTrap(data, trapId) : []),
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
  const [engReviewOpen, setEngReviewOpen] = useState(false);
  const [editEngReviewId, setEditEngReviewId] = useState<string | undefined>();

  const openEngReview = (recordId?: string) => {
    setEditEngReviewId(recordId);
    setEngReviewOpen(true);
  };

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
            className="btn-secondary"
            onClick={() => exportTrapWorkbookExcel(data, view.tag, view.id)}
            title="Export this trap's inspection and maintenance history (Excel)"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
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
        <TrapAlertBanner
          key={alert.type}
          alert={alert}
          action={
            alert.type === 'engineering_review'
              ? { label: 'Record engineering review', onClick: () => openEngReview() }
              : undefined
          }
        />
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Inspection History
            </h3>
            <span className="shrink-0 text-xs text-slate-400">{history.length} records</span>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No inspections recorded yet.</p>
          ) : (
            <ul className="max-h-[32rem] space-y-4 overflow-y-auto border-l-2 border-slate-200 pl-4 pr-1">
              {history.map((entry) => {
                if (entry.kind === 'pm') {
                  const r = entry.record;
                  return (
                    <li key={r.id} className="relative min-w-0">
                      <span
                        className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full ring-2 ring-white ${
                          r.status === 'Issue' ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                      />
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{r.date}</span>
                          <StatusBadge status={r.status} issueType={r.issue_type} />
                        </div>
                        <p className="text-xs text-slate-500">Technician: {r.technician}</p>
                        {r.notes && (
                          <p className="break-words text-sm text-slate-700">{r.notes}</p>
                        )}
                        <div className="flex gap-3">
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
                    </li>
                  );
                }

                const sd = entry.record;
                return (
                  <li key={sd.id} className="relative min-w-0">
                    <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-sky-500 ring-2 ring-white" />
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{sd.recorded_date}</span>
                        <ShutdownDeferralBadge />
                      </div>
                      <p className="text-xs text-slate-500">
                        PM due: <span className="font-mono">{sd.pm_due_date}</span> · Technician:{' '}
                        {sd.technician}
                      </p>
                      {sd.notes && (
                        <p className="break-words text-sm text-slate-700">{sd.notes}</p>
                      )}
                      <div className="flex gap-3">
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
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
                Maintenance & Replacement History
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Repairs, preventive maintenance, and trap replacements
              </p>
            </div>
            <button className="btn-secondary shrink-0 text-sm" onClick={() => openMnt()}>
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
            <ul className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
              {maintenance.map((m) => (
                <li key={m.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold">{m.date}</span>
                    <MaintenanceActionBadge action={m.action} />
                    {m.cost != null && (
                      <span className="ml-auto font-mono text-xs text-slate-600">
                        ${m.cost.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-800">{m.description}</p>
                  {m.parts_replaced && (
                    <p className="mt-1 text-xs text-slate-500">
                      Parts: {m.parts_replaced}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">Technician: {m.technician}</p>
                  {m.notes && (
                    <p className="mt-1 break-words text-xs text-slate-500">{m.notes}</p>
                  )}
                  <div className="mt-2 flex gap-3">
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Engineering Reviews
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Completed reviews clear the alert until new failures accumulate
            </p>
          </div>
          <button className="btn-secondary shrink-0 text-sm" onClick={() => openEngReview()}>
            <ShieldCheck className="h-4 w-4" />
            Record review
          </button>
        </div>

        {engineeringReviews.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No engineering reviews recorded yet.</p>
            {view.engineering_review_required && (
              <button className="btn-primary mt-3 inline-flex text-sm" onClick={() => openEngReview()}>
                Record engineering review
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {engineeringReviews.map((review) => (
              <li key={review.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold">{review.review_date}</span>
                  <EngineeringReviewOutcomeBadge outcome={review.outcome} />
                </div>
                <p className="mt-2 text-xs text-slate-500">Reviewer: {review.reviewer}</p>
                {review.outcome === 'Trap replaced' &&
                  (review.replacement_manufacturer || review.replacement_model) && (
                    <p className="mt-1 text-sm text-slate-700">
                      Replacement:{' '}
                      {[review.replacement_manufacturer, review.replacement_model]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                {review.replacement_notes && (
                  <p className="mt-1 text-xs text-slate-500">{review.replacement_notes}</p>
                )}
                {review.notes && (
                  <p className="mt-1 break-words text-sm text-slate-700">{review.notes}</p>
                )}
                <div className="mt-2 flex gap-3">
                  <button
                    className="text-xs font-semibold text-slate-600 hover:underline"
                    onClick={() => openEngReview(review.id)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-xs font-semibold text-red-600 hover:underline"
                    onClick={() => {
                      if (confirm('Delete this engineering review record?')) {
                        deleteEngineeringReview(review.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
      <EngineeringReviewFormModal
        open={engReviewOpen}
        onClose={() => {
          setEngReviewOpen(false);
          setEditEngReviewId(undefined);
        }}
        trapId={view.id}
        recordId={editEngReviewId}
      />
    </div>
  );
}
