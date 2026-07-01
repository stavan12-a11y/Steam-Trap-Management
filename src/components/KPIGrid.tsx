import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Droplets,
  FlaskConical,
  RefreshCw,
  TrendingUp,
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
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Fleet Status
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
            label="Overdue PM"
            value={kpis.overdue_pm}
            icon={Clock}
            accent="text-amber-600"
            iconBg="bg-amber-50"
          />
          <KPICard
            label="Upcoming PM"
            value={kpis.upcoming_pm}
            icon={Clock}
            accent="text-sky-600"
            iconBg="bg-sky-50"
            hint="Due within 14 days"
          />
          <KPICard
            label="Never Inspected"
            value={kpis.never_inspected}
            icon={ClipboardCheck}
            accent="text-slate-600"
            iconBg="bg-slate-100"
          />
          <KPICard
            label="Healthy"
            value={kpis.healthy}
            icon={CheckCircle2}
            accent="text-emerald-600"
            iconBg="bg-emerald-50"
            hint={
              kpis.total_traps > 0
                ? `${Math.round((kpis.healthy / kpis.total_traps) * 100)}% of fleet`
                : undefined
            }
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Performance & Alerts
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KPICard
            label="PM Compliance"
            value={`${kpis.pm_compliance_rate}%`}
            icon={TrendingUp}
            accent="text-emerald-700"
            iconBg="bg-emerald-50"
            hint="Inspected & on schedule"
          />
          <KPICard
            label="Fleet Reliability"
            value={`${kpis.fleet_reliability_rate}%`}
            icon={CheckCircle2}
            accent="text-teal-700"
            iconBg="bg-teal-50"
            hint="Not currently failing"
          />
          <KPICard
            label="Inspections (90d)"
            value={kpis.inspections_90d}
            icon={ClipboardCheck}
            accent="text-slate-700"
            iconBg="bg-slate-100"
            hint="PM activity"
          />
          <KPICard
            label="Avg Days Since PM"
            value={kpis.avg_days_since_pm ?? '—'}
            icon={Clock}
            accent="text-slate-600"
            iconBg="bg-slate-100"
            hint="Fleet average"
          />
          <KPICard
            label="Smart Alerts"
            value={kpis.smart_alerts}
            icon={FlaskConical}
            accent="text-violet-600"
            iconBg="bg-violet-50"
            hint="All triggered rules"
          />
          <KPICard
            label="Repeat Failures"
            value={kpis.repeat_failures}
            icon={RefreshCw}
            accent="text-orange-600"
            iconBg="bg-orange-50"
            hint="Same issue 2× / 12 mo"
          />
        </div>
      </div>
    </div>
  );
}
