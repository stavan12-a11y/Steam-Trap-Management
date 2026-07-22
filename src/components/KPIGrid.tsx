import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Droplets,
  Power,
  type LucideIcon,
} from 'lucide-react';
import type { KPIs } from '../utils/logic';
import type { KPIClickKey } from '../utils/kpiFilters';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  hint?: string;
  onClick?: () => void;
}

function KPICard({ label, value, icon: Icon, accent, iconBg, hint, onClick }: KPICardProps) {
  const clickable = Boolean(onClick);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`card flex w-full items-center gap-4 p-4 text-left transition-colors ${
        clickable
          ? 'cursor-pointer hover:border-maroon-200 hover:bg-maroon-50/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-700'
          : 'cursor-default'
      }`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${accent}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none text-slate-900">{value}</p>
        <p className="mt-1 truncate text-xs font-medium text-slate-500">{label}</p>
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
        {clickable && <p className="mt-1 text-[11px] font-medium text-maroon-800">View traps →</p>}
      </div>
    </button>
  );
}

interface KPIGridProps {
  kpis: KPIs;
  equipmentCount: number;
  onKpiClick?: (key: KPIClickKey) => void;
}

export function KPIGrid({ kpis, equipmentCount, onKpiClick }: KPIGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <KPICard
        label="Total Traps"
        value={kpis.total_traps}
        icon={Droplets}
        accent="text-slate-700"
        iconBg="bg-slate-100"
        hint={`${equipmentCount} equipment`}
        onClick={onKpiClick ? () => onKpiClick('total_traps') : undefined}
      />
      <KPICard
        label="Active Issues"
        value={kpis.active_issues}
        icon={AlertTriangle}
        accent="text-red-600"
        iconBg="bg-red-50"
        hint="Failing on last inspection"
        onClick={onKpiClick ? () => onKpiClick('active_issues') : undefined}
      />
      <KPICard
        label="Overdue PM"
        value={kpis.overdue_pm}
        icon={Clock}
        accent="text-amber-600"
        iconBg="bg-amber-50"
        hint="Inspection past due date"
        onClick={onKpiClick ? () => onKpiClick('overdue_pm') : undefined}
      />
      <KPICard
        label="Shutdown Deferrals"
        value={kpis.shutdown_deferred_traps}
        icon={Power}
        accent="text-sky-600"
        iconBg="bg-sky-50"
        hint="Traps PM deferred — equipment outage"
        onClick={onKpiClick ? () => onKpiClick('shutdown_deferred_traps') : undefined}
      />
      <KPICard
        label="Fleet Reliability"
        value={`${kpis.fleet_reliability_rate}%`}
        icon={CheckCircle2}
        accent="text-teal-700"
        iconBg="bg-teal-50"
        hint="% of inspected traps with a good result"
      />
    </div>
  );
}
