import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  type LucideIcon,
} from 'lucide-react';
import type { KPIs } from '../utils/logic';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  hint?: string;
}

function KPICard({ label, value, icon: Icon, accent, iconBg, hint }: KPICardProps) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${accent}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none text-slate-900">{value}</p>
        <p className="mt-1 truncate text-xs font-medium text-slate-500">{label}</p>
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

export function KPIGrid({ kpis, equipmentCount }: { kpis: KPIs; equipmentCount: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <KPICard
        label="Total Traps"
        value={kpis.total_traps}
        icon={Droplets}
        accent="text-slate-700"
        iconBg="bg-slate-100"
        hint={`${equipmentCount} equipment`}
      />
      <KPICard
        label="Active Issues"
        value={kpis.active_issues}
        icon={AlertTriangle}
        accent="text-red-600"
        iconBg="bg-red-50"
      />
      <KPICard
        label="Fleet Reliability"
        value={`${kpis.fleet_reliability_rate}%`}
        icon={CheckCircle2}
        accent="text-teal-700"
        iconBg="bg-teal-50"
        hint="Traps not currently failing"
      />
    </div>
  );
}
