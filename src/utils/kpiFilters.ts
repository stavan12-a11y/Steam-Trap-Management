import type { AppData, TrapView } from '../types';

export type KPIClickKey =
  | 'total_traps'
  | 'active_issues'
  | 'overdue_pm'
  | 'shutdown_deferred_traps';

export const KPI_MODAL_TITLES: Record<KPIClickKey, string> = {
  total_traps: 'All Traps',
  active_issues: 'Active Issues',
  overdue_pm: 'Overdue PM',
  shutdown_deferred_traps: 'Shutdown Deferrals',
};

export const KPI_MODAL_DESCRIPTIONS: Record<KPIClickKey, string> = {
  total_traps: 'Every trap in the fleet.',
  active_issues: 'Traps whose latest PM or TLV inspection result is not good.',
  overdue_pm: 'Traps past their PM due date.',
  shutdown_deferred_traps: 'Traps with PM deferred due to equipment shutdown.',
};

export function trapsForKpi(
  views: TrapView[],
  key: KPIClickKey,
  data: AppData,
): TrapView[] {
  switch (key) {
    case 'total_traps':
      return views;
    case 'active_issues':
      return views.filter((v) => v.status === 'Issue');
    case 'overdue_pm':
      return views.filter((v) => v.priority === 'Overdue');
    case 'shutdown_deferred_traps': {
      const deferredIds = new Set((data.shutdown_deferrals ?? []).map((d) => d.trap_id));
      return views.filter((v) => deferredIds.has(v.id));
    }
  }
}
