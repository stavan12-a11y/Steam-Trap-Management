import type { TrapAlert, TrapAlertType } from '../types';

const BASE =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap';

const ALERT_STYLES: Record<TrapAlertType, string> = {
  engineering_review: 'bg-violet-100 text-violet-800 ring-violet-600/20',
  repeat_failure: 'bg-orange-100 text-orange-800 ring-orange-600/20',
};

const ALERT_COMPACT: Record<TrapAlertType, string> = {
  engineering_review: 'Eng. Review',
  repeat_failure: 'Repeat',
};

export function TrapAlertBadge({ alert, compact }: { alert: TrapAlert; compact?: boolean }) {
  return (
    <span className={`${BASE} ${ALERT_STYLES[alert.type]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {compact ? ALERT_COMPACT[alert.type] : alert.label}
    </span>
  );
}

export function TrapAlertBadges({ alerts, compact }: { alerts: TrapAlert[]; compact?: boolean }) {
  if (alerts.length === 0) return null;
  return (
    <>
      {alerts.map((a) => (
        <TrapAlertBadge key={a.type} alert={a} compact={compact} />
      ))}
    </>
  );
}

const BANNER_STYLES: Record<TrapAlertType, string> = {
  engineering_review: 'border-violet-200 bg-violet-50 text-violet-900',
  repeat_failure: 'border-orange-200 bg-orange-50 text-orange-900',
};

export function TrapAlertBanner({ alert }: { alert: TrapAlert }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${BANNER_STYLES[alert.type]}`}
    >
      <div>
        <p className="font-semibold">{alert.label}</p>
        <p className="mt-0.5">{alert.message}</p>
      </div>
    </div>
  );
}
