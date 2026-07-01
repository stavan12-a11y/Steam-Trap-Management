import type { Priority } from '../types';

export function priorityColor(p: Priority): "red" | "amber" | "blue" | "green" | "gray" {
  switch (p) {
    case "Issue":
      return "red";
    case "Overdue":
      return "amber";
    case "Upcoming":
      return "blue";
    case "Never inspected":
      return "gray";
    case "Healthy":
      return "green";
  }
}

export function dueLabel(daysUntilDue: number | null, priority: Priority): string {
  if (priority === "Never inspected") return "Never inspected";
  if (daysUntilDue === null) return "—";
  if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)}d overdue`;
  if (daysUntilDue === 0) return "Due today";
  return `${daysUntilDue}d`;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return iso;
}
