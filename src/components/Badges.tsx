import type { Priority, TrapStatus, IssueType } from '../types';

const BASE =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap';

const PRIORITY_STYLES: Record<Priority, string> = {
  Issue: 'bg-red-100 text-red-800 ring-red-600/20',
  Overdue: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  Upcoming: 'bg-sky-100 text-sky-800 ring-sky-600/20',
  'Never inspected': 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Healthy: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`${BASE} ${PRIORITY_STYLES[priority]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {priority}
    </span>
  );
}

export function StatusBadge({
  status,
  issueType,
}: {
  status: TrapStatus | null;
  issueType?: IssueType | null;
}) {
  if (status === null) {
    return <span className={`${BASE} bg-slate-100 text-slate-600 ring-slate-500/20`}>No PM</span>;
  }
  if (status === 'Issue') {
    return (
      <span className={`${BASE} bg-red-100 text-red-800 ring-red-600/20`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
        {issueType ? `Issue · ${issueType}` : 'Issue'}
      </span>
    );
  }
  return (
    <span className={`${BASE} bg-emerald-100 text-emerald-800 ring-emerald-600/20`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      Working
    </span>
  );
}

const ACTION_STYLES: Record<string, string> = {
  Maintenance: 'bg-sky-100 text-sky-800 ring-sky-600/20',
  Repair: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  Replacement: 'bg-indigo-100 text-indigo-800 ring-indigo-600/20',
};

export function MaintenanceActionBadge({ action }: { action: string }) {
  return (
    <span className={`${BASE} ${ACTION_STYLES[action] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20'}`}>
      {action}
    </span>
  );
}
