export const TRAP_TYPES = [
  "Float & Thermostatic",
  "Inverted Bucket",
  "Thermodynamic",
  "Thermostatic",
  "Bimetallic",
] as const;
export type TrapTypeName = (typeof TRAP_TYPES)[number];

export const CONNECTION_TYPES = [
  "NPT Threaded",
  "Flanged",
  "Socket Weld",
  "Butt Weld",
  "Tri-Clamp",
] as const;
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

export const TRAP_STATUSES = ["Working", "Issue"] as const;
export type TrapStatus = (typeof TRAP_STATUSES)[number];

export const ISSUE_TYPES = ["Blowing", "Blocked", "Leak", "Cycling"] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

/** Trap priority buckets, highest urgency first. */
export const PRIORITIES = [
  "Issue",
  "Overdue",
  "Upcoming",
  "Never inspected",
  "Healthy",
] as const;
export type Priority = (typeof PRIORITIES)[number];

export const MAINTENANCE_ACTIONS = ["Maintenance", "Repair", "Replacement"] as const;
export type MaintenanceAction = (typeof MAINTENANCE_ACTIONS)[number];

export const TRAP_ALERT_TYPES = [
  'engineering_review',
  'repeat_failure',
] as const;
export type TrapAlertType = (typeof TRAP_ALERT_TYPES)[number];

export interface TrapAlert {
  type: TrapAlertType;
  label: string;
  message: string;
  severity: 'high' | 'medium';
}

export interface Equipment {
  id: string;
  name: string;
  area: string;
}

export interface Trap {
  id: string;
  tag: string;
  type: TrapTypeName;
  location: string;
  equipment_id: string;
  manufacturer: string;
  model: string;
  connection_type: string;
  trap_size: string;
  serial_number: string;
  install_date: string | null;
}

export interface PMRecord {
  id: string;
  trap_id: string;
  date: string; // ISO date (YYYY-MM-DD)
  status: TrapStatus;
  issue_type: IssueType | null;
  technician: string;
  notes: string;
  created_at: string; // ISO timestamp
}

export interface MaintenanceRecord {
  id: string;
  trap_id: string;
  date: string; // ISO date (YYYY-MM-DD)
  action: MaintenanceAction;
  technician: string;
  description: string;
  parts_replaced: string;
  cost: number | null;
  notes: string;
  created_at: string;
}

/** PM deferred because equipment was under shutdown — does not reset the PM schedule. */
export interface ShutdownDeferral {
  id: string;
  trap_id: string;
  recorded_date: string;
  pm_due_date: string;
  technician: string;
  notes: string;
  created_at: string;
}

export const ENGINEERING_REVIEW_OUTCOMES = [
  'Reviewed — continue monitoring',
  'Trap replaced',
  'Sizing corrected',
  'Root cause addressed',
  'Other',
] as const;
export type EngineeringReviewOutcome = (typeof ENGINEERING_REVIEW_OUTCOMES)[number];

/** Engineering review completed for a trap — clears the review alert until new failures accumulate. */
export interface EngineeringReviewRecord {
  id: string;
  trap_id: string;
  review_date: string;
  reviewer: string;
  outcome: EngineeringReviewOutcome;
  replacement_manufacturer: string;
  replacement_model: string;
  replacement_notes: string;
  notes: string;
  created_at: string;
}

/** Daily fleet KPI snapshot for trend analytics and export. */
export interface KPISnapshot {
  id: string;
  date: string;
  total_traps: number;
  active_issues: number;
  overdue_pm: number;
  fleet_reliability_rate: number;
  due_soon_pm: number;
  on_track_pm: number;
  never_inspected: number;
  healthy_count: number;
  upcoming_count: number;
  issue_priority_count: number;
  blowing_issues: number;
  blocked_issues: number;
  leak_issues: number;
  cycling_issues: number;
  engineering_review_count: number;
  smart_alert_count: number;
  shutdown_deferred_traps: number;
  shutdown_deferral_records: number;
  priority_breakdown: Record<string, number>;
  created_at: string;
}

export interface Database {
  equipment: Equipment[];
  traps: Trap[];
  pm_records: PMRecord[];
  maintenance_records: MaintenanceRecord[];
  shutdown_deferrals: ShutdownDeferral[];
  engineering_reviews: EngineeringReviewRecord[];
  kpi_snapshots: KPISnapshot[];
  /** Bumped when seed schema or demo data changes — prompts refresh if stale. */
  data_version?: number;
}

/** Alias matching the PSV dashboard naming convention. */
export type AppData = Database;

/** A trap enriched with its derived current state + priority. */
export interface TrapView extends Trap {
  equipment_name: string;
  equipment_area: string;
  status: TrapStatus | null;
  issue_type: IssueType | null;
  last_pm_date: string | null;
  next_pm_date: string | null;
  days_until_due: number | null;
  priority: Priority;
  pm_interval_days: number;
  failure_count_36mo: number;
  engineering_review_required: boolean;
  engineering_review_reason: string | null;
  alerts: TrapAlert[];
  alert_count: number;
}

export const DEFAULT_TRAP_DATASHEET: Pick<
  Trap,
  'manufacturer' | 'model' | 'connection_type' | 'trap_size' | 'serial_number' | 'install_date'
> = {
  manufacturer: '',
  model: '',
  connection_type: '',
  trap_size: '',
  serial_number: '',
  install_date: null,
};
