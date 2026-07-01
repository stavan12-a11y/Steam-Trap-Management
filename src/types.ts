export const TRAP_TYPES = [
  "Float & Thermostatic",
  "Inverted Bucket",
  "Thermodynamic",
  "Thermostatic",
  "Bimetallic",
] as const;
export type TrapTypeName = (typeof TRAP_TYPES)[number];

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

export interface Equipment {
  id: string;
  name: string;
  area: string;
  is_running: boolean;
}

export interface Trap {
  id: string;
  tag: string;
  type: TrapTypeName;
  location: string;
  equipment_id: string;
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

export interface TrapTypeConfig {
  type: TrapTypeName;
  pm_interval_days: number;
}

export interface Database {
  equipment: Equipment[];
  traps: Trap[];
  pm_records: PMRecord[];
  trap_types: TrapTypeConfig[];
}

/** Alias matching the PSV dashboard naming convention. */
export type AppData = Database;

/** A trap enriched with its derived current state + priority. */
export interface TrapView extends Trap {
  equipment_name: string;
  equipment_area: string;
  equipment_running: boolean;
  status: TrapStatus | null;
  issue_type: IssueType | null;
  last_pm_date: string | null;
  next_pm_date: string | null;
  days_until_due: number | null;
  priority: Priority;
  pm_interval_days: number;
}
