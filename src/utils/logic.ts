import type {
  Database,
  Equipment,
  IssueType,
  MaintenanceRecord,
  PMRecord,
  Priority,
  ShutdownDeferral,
  Trap,
  TrapAlert,
  TrapView,
} from '../types';
import { PRIORITIES } from '../types';

export const UPCOMING_WINDOW_DAYS = 14;
export const PM_INTERVAL_DAYS = 90; // 3 months — uniform for all trap types
export const ENGINEERING_REVIEW_FAILURE_THRESHOLD = 3;
export const ENGINEERING_REVIEW_WINDOW_MONTHS = 36;
export const REPEAT_FAILURE_THRESHOLD = 2;
export const REPEAT_FAILURE_WINDOW_MONTHS = 12;

/** Today as a UTC date string (YYYY-MM-DD). */
export function todayISO(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function parseUTC(dateStr: string): number {
  return Date.parse(`${dateStr}T00:00:00Z`);
}

/** Whole-day difference: addDays(date, n). Returns YYYY-MM-DD. */
export function addDays(dateStr: string, days: number): string {
  const ms = parseUTC(dateStr) + days * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** b - a in whole days. */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseUTC(b) - parseUTC(a)) / 86400000);
}

/** Date N months before today (approx. 30 days/month). */
export function monthsAgoISO(months: number, today = todayISO()): string {
  return addDays(today, -months * 30);
}

const PRIORITY_RANK: Record<Priority, number> = PRIORITIES.reduce(
  (acc, p, i) => {
    acc[p] = i;
    return acc;
  },
  {} as Record<Priority, number>,
);

export function priorityRank(p: Priority): number {
  return PRIORITY_RANK[p];
}

/** Returns the most recent PM record for a trap (by date, then created_at). */
export function latestRecord(records: PMRecord[]): PMRecord | null {
  if (records.length === 0) return null;
  return [...records].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.created_at < b.created_at ? 1 : -1;
  })[0];
}

/** All PM records for a trap, newest first. */
export function recordsForTrap(db: Database, trapId: string): PMRecord[] {
  return db.pm_records
    .filter((r) => r.trap_id === trapId)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.created_at < b.created_at ? 1 : -1;
    });
}

/** All maintenance records for a trap, newest first. */
export function maintenanceForTrap(db: Database, trapId: string): MaintenanceRecord[] {
  return (db.maintenance_records ?? [])
    .filter((r) => r.trap_id === trapId)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.created_at < b.created_at ? 1 : -1;
    });
}

/** All shutdown deferrals for a trap, newest first. */
export function shutdownDeferralsForTrap(db: Database, trapId: string): ShutdownDeferral[] {
  return (db.shutdown_deferrals ?? [])
    .filter((r) => r.trap_id === trapId)
    .sort((a, b) => {
      if (a.recorded_date !== b.recorded_date) return a.recorded_date < b.recorded_date ? 1 : -1;
      return a.created_at < b.created_at ? 1 : -1;
    });
}

/** Uniform PM interval — 3 months for every trap type. */
export function pmIntervalDays(): number {
  return PM_INTERVAL_DAYS;
}

/** Count issue PM records within a rolling window. */
export function failureCountInWindow(
  records: PMRecord[],
  windowStart: string,
  today = todayISO(),
): number {
  return records.filter(
    (r) => r.status === 'Issue' && r.date >= windowStart && r.date <= today,
  ).length;
}

/** Derive engineering review flag from failure history. */
export function evaluateEngineeringReview(
  records: PMRecord[],
  today = todayISO(),
): { required: boolean; reason: string | null; failure_count_36mo: number } {
  const windowStart = monthsAgoISO(ENGINEERING_REVIEW_WINDOW_MONTHS, today);
  const failure_count_36mo = failureCountInWindow(records, windowStart, today);

  if (failure_count_36mo >= ENGINEERING_REVIEW_FAILURE_THRESHOLD) {
    return {
      required: true,
      reason: `${failure_count_36mo} failures in the last ${ENGINEERING_REVIEW_WINDOW_MONTHS} months — engineering review recommended`,
      failure_count_36mo,
    };
  }

  return { required: false, reason: null, failure_count_36mo };
}

/** Same issue type recorded 2+ times within 12 months. */
export function evaluateRepeatFailure(
  records: PMRecord[],
  today = todayISO(),
): { triggered: boolean; issueType: IssueType | null; count: number; reason: string | null } {
  const windowStart = monthsAgoISO(REPEAT_FAILURE_WINDOW_MONTHS, today);
  const issues = records.filter(
    (r) => r.status === 'Issue' && r.issue_type && r.date >= windowStart && r.date <= today,
  );

  const byType = new Map<IssueType, number>();
  for (const r of issues) {
    if (!r.issue_type) continue;
    byType.set(r.issue_type, (byType.get(r.issue_type) ?? 0) + 1);
  }

  let worst: { type: IssueType; count: number } | null = null;
  for (const [type, count] of byType) {
    if (count >= REPEAT_FAILURE_THRESHOLD && (!worst || count > worst.count)) {
      worst = { type, count };
    }
  }

  if (!worst) {
    return { triggered: false, issueType: null, count: 0, reason: null };
  }

  return {
    triggered: true,
    issueType: worst.type,
    count: worst.count,
    reason: `${worst.type} recorded ${worst.count} times in ${REPEAT_FAILURE_WINDOW_MONTHS} months — possible sizing or root-cause issue`,
  };
}

/** Build all smart alerts for a trap. */
export function buildTrapAlerts(
  records: PMRecord[],
  today = todayISO(),
): TrapAlert[] {
  const alerts: TrapAlert[] = [];

  const eng = evaluateEngineeringReview(records, today);
  if (eng.required && eng.reason) {
    alerts.push({
      type: 'engineering_review',
      label: 'Engineering Review',
      message: eng.reason,
      severity: 'high',
    });
  }

  const repeat = evaluateRepeatFailure(records, today);
  if (repeat.triggered && repeat.reason) {
    alerts.push({
      type: 'repeat_failure',
      label: 'Repeat Failure',
      message: repeat.reason,
      severity: 'high',
    });
  }

  return alerts;
}

export function hasTrapAlerts(view: TrapView): boolean {
  return view.alert_count > 0;
}

export function trapHasAlert(view: TrapView, type: TrapAlert['type']): boolean {
  return view.alerts.some((a) => a.type === type);
}

/**
 * Derives the full current-state view of a trap, including computed priority.
 * Priority precedence: Issue → Overdue → Upcoming → Never inspected → Healthy.
 */
export function buildTrapView(
  db: Database,
  trap: Trap,
  equipment: Equipment,
  today = todayISO(),
): TrapView {
  const records = db.pm_records.filter((r) => r.trap_id === trap.id);
  const latest = latestRecord(records);
  const interval = pmIntervalDays();
  const review = evaluateEngineeringReview(records, today);
  const alerts = buildTrapAlerts(records, today);

  const last_pm_date = latest ? latest.date : null;
  const status = latest ? latest.status : null;
  const issue_type = latest ? latest.issue_type : null;

  const next_pm_date = last_pm_date ? addDays(last_pm_date, interval) : null;
  const days_until_due = next_pm_date ? daysBetween(today, next_pm_date) : null;

  let priority: Priority;
  if (status === 'Issue') {
    priority = 'Issue';
  } else if (!last_pm_date) {
    priority = 'Never inspected';
  } else if (days_until_due !== null && days_until_due < 0) {
    priority = 'Overdue';
  } else if (days_until_due !== null && days_until_due <= UPCOMING_WINDOW_DAYS) {
    priority = 'Upcoming';
  } else {
    priority = 'Healthy';
  }

  return {
    ...trap,
    equipment_name: equipment.name,
    equipment_area: equipment.area,
    status,
    issue_type,
    last_pm_date,
    next_pm_date,
    days_until_due,
    priority,
    pm_interval_days: interval,
    failure_count_36mo: review.failure_count_36mo,
    engineering_review_required: review.required,
    engineering_review_reason: review.reason,
    alerts,
    alert_count: alerts.length,
  };
}

export function allTrapViews(db: Database, today = todayISO()): TrapView[] {
  const eqById = new Map(db.equipment.map((e) => [e.id, e]));
  return db.traps
    .map((t) => {
      const eq = eqById.get(t.equipment_id);
      if (!eq) return null;
      return buildTrapView(db, t, eq, today);
    })
    .filter((v): v is TrapView => v !== null);
}

/** Sort by priority urgency, then by how overdue (most overdue first), then tag. */
export function sortByPriority(views: TrapView[]): TrapView[] {
  return [...views].sort((a, b) => {
    const pr = priorityRank(a.priority) - priorityRank(b.priority);
    if (pr !== 0) return pr;
    const da = a.days_until_due ?? Number.POSITIVE_INFINITY;
    const dbb = b.days_until_due ?? Number.POSITIVE_INFINITY;
    if (da !== dbb) return da - dbb;
    return a.tag.localeCompare(b.tag);
  });
}

export interface KPIs {
  total_traps: number;
  active_issues: number;
  overdue_pm: number;
  fleet_reliability_rate: number;
  shutdown_deferred_traps: number;
}

/** Unique traps with at least one equipment shutdown PM deferral on record. */
export function countShutdownDeferredTraps(data: Database): number {
  return new Set((data.shutdown_deferrals ?? []).map((d) => d.trap_id)).size;
}

export function computeKPIs(views: TrapView[], data?: Database): KPIs {
  const total = views.length;
  const active_issues = views.filter((v) => v.priority === 'Issue').length;

  return {
    total_traps: total,
    active_issues,
    overdue_pm: views.filter((v) => v.priority === 'Overdue').length,
    fleet_reliability_rate: total > 0 ? Math.round(((total - active_issues) / total) * 100) : 100,
    shutdown_deferred_traps: data ? countShutdownDeferredTraps(data) : 0,
  };
}

export interface AlertTypeCount {
  type: TrapAlert['type'];
  label: string;
  count: number;
  color: string;
}

/** Fleet-wide count of each smart alert type. */
export function alertBreakdown(views: TrapView[]): AlertTypeCount[] {
  const labels: Record<TrapAlert['type'], string> = {
    engineering_review: 'Engineering Review',
    repeat_failure: 'Repeat Failure',
  };
  const colors: Record<TrapAlert['type'], string> = {
    engineering_review: '#7c3aed',
    repeat_failure: '#c2410c',
  };

  const counts = new Map<TrapAlert['type'], number>();
  for (const v of views) {
    for (const a of v.alerts) {
      counts.set(a.type, (counts.get(a.type) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([type, count]) => ({
      type,
      label: labels[type],
      count,
      color: colors[type],
    }))
    .sort((a, b) => b.count - a.count);
}

export interface StatusSlice {
  name: string;
  description: string;
  value: number;
  color: string;
}

/** PM schedule from due dates only — independent of whether the trap is failing. */
export function pmScheduleBreakdown(views: TrapView[]): StatusSlice[] {
  const slices: StatusSlice[] = [
    {
      name: 'On Track',
      description: 'Next PM more than 14 days away',
      value: views.filter(
        (v) => v.last_pm_date && v.days_until_due !== null && v.days_until_due > UPCOMING_WINDOW_DAYS,
      ).length,
      color: '#059669',
    },
    {
      name: 'Due Soon',
      description: 'Next PM within 14 days',
      value: views.filter(
        (v) =>
          v.last_pm_date &&
          v.days_until_due !== null &&
          v.days_until_due >= 0 &&
          v.days_until_due <= UPCOMING_WINDOW_DAYS,
      ).length,
      color: '#0284c7',
    },
    {
      name: 'Overdue',
      description: 'Inspection past due date',
      value: views.filter(
        (v) => v.last_pm_date && v.days_until_due !== null && v.days_until_due < 0,
      ).length,
      color: '#d97706',
    },
    {
      name: 'Never Inspected',
      description: 'No PM record on file',
      value: views.filter((v) => !v.last_pm_date).length,
      color: '#64748b',
    },
  ];
  return slices.filter((d) => d.value > 0);
}

export interface PriorityBreakdown {
  name: string;
  value: number;
  color: string;
}

export function priorityBreakdown(views: TrapView[]): PriorityBreakdown[] {
  const colors: Record<Priority, string> = {
    Issue: '#dc2626',
    Overdue: '#d97706',
    Upcoming: '#0284c7',
    'Never inspected': '#64748b',
    Healthy: '#059669',
  };
  return PRIORITIES.map((p) => ({
    name: p,
    value: views.filter((v) => v.priority === p).length,
    color: colors[p],
  })).filter((d) => d.value > 0);
}

export interface IssueTypeCount {
  type: IssueType;
  count: number;
}

/** Count current active issues by type. */
export function activeIssuesByType(views: TrapView[]): IssueTypeCount[] {
  const counts = new Map<IssueType, number>();
  for (const v of views) {
    if (v.priority === 'Issue' && v.issue_type) {
      counts.set(v.issue_type, (counts.get(v.issue_type) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([type, count]) => ({ type, count }));
}

export interface MonthlyPMCount {
  month: string;
  inspections: number;
  issues: number;
}

/** PM activity grouped by month for the last N months. */
export function pmActivityByMonth(
  db: Database,
  months = 12,
  today = todayISO(),
): MonthlyPMCount[] {
  const result: MonthlyPMCount[] = [];
  const todayDate = new Date(`${today}T00:00:00Z`);

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setUTCMonth(d.getUTCMonth() - i);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const inspections = db.pm_records.filter((r) => r.date.startsWith(key)).length;
    const issues = db.pm_records.filter((r) => r.date.startsWith(key) && r.status === 'Issue').length;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    result.push({ month: label, inspections, issues });
  }
  return result;
}

export interface EquipmentIssueCount {
  equipment: string;
  issues: number;
  traps: number;
}

/** Active issue count grouped by equipment. */
export function issuesByEquipment(views: TrapView[]): EquipmentIssueCount[] {
  const byEquipment = new Map<string, { issues: number; traps: number }>();
  for (const v of views) {
    const name = v.equipment_name || 'Unassigned';
    const cur = byEquipment.get(name) ?? { issues: 0, traps: 0 };
    cur.traps++;
    if (v.priority === 'Issue') cur.issues++;
    byEquipment.set(name, cur);
  }
  return [...byEquipment.entries()]
    .map(([equipment, { issues, traps }]) => ({ equipment, issues, traps }))
    .sort((a, b) => b.issues - a.issues);
}

export interface EquipmentRollup {
  id: string;
  name: string;
  area: string;
  trap_count: number;
  issue_count: number;
  overdue_count: number;
  engineering_review_count: number;
  smart_alert_count: number;
}

export function equipmentRollups(
  db: Database,
  today = todayISO(),
): EquipmentRollup[] {
  const views = allTrapViews(db, today);
  return db.equipment.map((eq) => {
    const eqViews = views.filter((v) => v.equipment_id === eq.id);
    return {
      id: eq.id,
      name: eq.name,
      area: eq.area,
      trap_count: eqViews.length,
      issue_count: eqViews.filter((v) => v.priority === 'Issue').length,
      overdue_count: eqViews.filter((v) => v.priority === 'Overdue').length,
      engineering_review_count: eqViews.filter((v) => v.engineering_review_required).length,
      smart_alert_count: eqViews.filter((v) => v.alert_count > 0).length,
    };
  });
}
