import type {
  Database,
  Equipment,
  PMRecord,
  Priority,
  Trap,
  TrapView,
} from '../types';
import { PRIORITIES } from '../types';

export const UPCOMING_WINDOW_DAYS = 14;

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

export function intervalForType(db: Database, type: string): number {
  const cfg = db.trap_types.find((t) => t.type === type);
  return cfg ? cfg.pm_interval_days : 365;
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
  const interval = intervalForType(db, trap.type);

  const last_pm_date = latest ? latest.date : null;
  const status = latest ? latest.status : null;
  const issue_type = latest ? latest.issue_type : null;

  const next_pm_date = last_pm_date ? addDays(last_pm_date, interval) : null;
  const days_until_due = next_pm_date ? daysBetween(today, next_pm_date) : null;

  let priority: Priority;
  if (status === "Issue") {
    priority = "Issue";
  } else if (!last_pm_date) {
    priority = "Never inspected";
  } else if (days_until_due !== null && days_until_due < 0) {
    priority = "Overdue";
  } else if (days_until_due !== null && days_until_due <= UPCOMING_WINDOW_DAYS) {
    priority = "Upcoming";
  } else {
    priority = "Healthy";
  }

  return {
    ...trap,
    equipment_name: equipment.name,
    equipment_area: equipment.area,
    equipment_running: equipment.is_running,
    status,
    issue_type,
    last_pm_date,
    next_pm_date,
    days_until_due,
    priority,
    pm_interval_days: interval,
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
  healthy: number;
}

export function computeKPIs(views: TrapView[]): KPIs {
  return {
    total_traps: views.length,
    active_issues: views.filter((v) => v.priority === "Issue").length,
    overdue_pm: views.filter((v) => v.priority === "Overdue").length,
    healthy: views.filter((v) => v.priority === "Healthy").length,
  };
}

export interface EquipmentRollup {
  id: string;
  name: string;
  area: string;
  is_running: boolean;
  trap_count: number;
  issue_count: number;
  overdue_count: number;
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
      is_running: eq.is_running,
      trap_count: eqViews.length,
      issue_count: eqViews.filter((v) => v.priority === "Issue").length,
      overdue_count: eqViews.filter((v) => v.priority === "Overdue").length,
    };
  });
}
