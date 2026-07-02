import type { AppData, KPISnapshot } from '../types';
import {
  activeIssuesByType,
  allTrapViews,
  computeKPIs,
  countShutdownDeferredTraps,
  pmScheduleBreakdown,
  priorityBreakdown,
  todayISO,
} from './logic';
import { uid } from './id';

function priorityCount(views: ReturnType<typeof allTrapViews>, priority: string) {
  return views.filter((v) => v.priority === priority).length;
}

/** Capture fleet KPIs and breakdowns for a single date (typically today). */
export function buildKPISnapshot(data: AppData, date = todayISO()): KPISnapshot {
  const views = allTrapViews(data, date);
  const kpis = computeKPIs(views, data);
  const pmSchedule = pmScheduleBreakdown(views);
  const issuesByType = activeIssuesByType(views);
  const priorities = priorityBreakdown(views);

  const scheduleMap = Object.fromEntries(pmSchedule.map((s) => [s.name, s.value]));
  const issueMap = Object.fromEntries(issuesByType.map((i) => [i.type, i.count]));

  return {
    id: uid('kpi'),
    date,
    total_traps: kpis.total_traps,
    active_issues: kpis.active_issues,
    overdue_pm: kpis.overdue_pm,
    fleet_reliability_rate: kpis.fleet_reliability_rate,
    due_soon_pm: scheduleMap['Due Soon'] ?? 0,
    on_track_pm: scheduleMap['On Track'] ?? 0,
    never_inspected: scheduleMap['Never Inspected'] ?? 0,
    healthy_count: priorityCount(views, 'Healthy'),
    upcoming_count: priorityCount(views, 'Upcoming'),
    issue_priority_count: priorityCount(views, 'Issue'),
    blowing_issues: issueMap.Blowing ?? 0,
    blocked_issues: issueMap.Blocked ?? 0,
    leak_issues: issueMap.Leak ?? 0,
    cycling_issues: issueMap.Cycling ?? 0,
    engineering_review_count: views.filter((v) => v.engineering_review_required).length,
    smart_alert_count: views.filter((v) => v.alert_count > 0).length,
    shutdown_deferred_traps: countShutdownDeferredTraps(data),
    shutdown_deferral_records: (data.shutdown_deferrals ?? []).length,
    priority_breakdown: Object.fromEntries(priorities.map((p) => [p.name, p.value])),
    created_at: new Date().toISOString(),
  };
}

function snapshotMetricsEqual(a: KPISnapshot, b: KPISnapshot): boolean {
  return (
    a.total_traps === b.total_traps &&
    a.active_issues === b.active_issues &&
    a.overdue_pm === b.overdue_pm &&
    a.fleet_reliability_rate === b.fleet_reliability_rate &&
    a.due_soon_pm === b.due_soon_pm &&
    a.on_track_pm === b.on_track_pm &&
    a.never_inspected === b.never_inspected &&
    a.shutdown_deferred_traps === b.shutdown_deferred_traps
  );
}

/** Upsert today's KPI snapshot after trap/PM data changes. */
export function upsertTodayKPISnapshot(data: AppData): AppData {
  const today = todayISO();
  const snap = buildKPISnapshot(data, today);
  const snapshots = data.kpi_snapshots ?? [];
  const idx = snapshots.findIndex((s) => s.date === today);

  if (idx >= 0) {
    if (snapshotMetricsEqual(snapshots[idx], snap)) return data;
    const next = [...snapshots];
    next[idx] = { ...snap, id: snapshots[idx].id, created_at: snapshots[idx].created_at };
    return { ...data, kpi_snapshots: next };
  }

  return {
    ...data,
    kpi_snapshots: [...snapshots, snap].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function sortedKPISnapshots(data: AppData): KPISnapshot[] {
  return [...(data.kpi_snapshots ?? [])].sort((a, b) => a.date.localeCompare(b.date));
}

export function delta(current: number, previous: number | undefined): string | number {
  if (previous === undefined) return '';
  return current - previous;
}
