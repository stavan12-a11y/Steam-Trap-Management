import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSteamTrap } from '../store/SteamTrapContext';
import {
  activeIssuesByType,
  allTrapViews,
  issuesByArea,
  pmActivityByMonth,
  priorityBreakdown,
} from '../utils/logic';

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card flex flex-col p-4">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="min-h-[220px] flex-1">{children}</div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">{message}</div>
  );
}

export function KPIChartsPanel() {
  const { data } = useSteamTrap();
  const views = useMemo(() => allTrapViews(data), [data]);
  const fleetHealth = useMemo(() => priorityBreakdown(views), [views]);
  const issueTypes = useMemo(() => activeIssuesByType(views), [views]);
  const pmTrend = useMemo(() => pmActivityByMonth(data), [data]);
  const areaIssues = useMemo(() => issuesByArea(views).filter((a) => a.issues > 0), [views]);

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Fleet Analytics</h3>
        <p className="text-sm text-slate-500">Visual breakdown for trend analysis and planning.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Fleet Health" subtitle="Traps by priority status">
          {fleetHealth.length === 0 ? (
            <EmptyChart message="No traps to display" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={fleetHealth}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {fleetHealth.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value ?? 0} traps`]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Active Issues by Type" subtitle="Current open issues only">
          {issueTypes.length === 0 ? (
            <EmptyChart message="No active issues" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={issueTypes} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="type" width={72} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#dc2626" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="PM Activity Trend" subtitle="Inspections and issues — last 12 months">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={pmTrend} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="inspections" stroke="#500000" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="issues" stroke="#dc2626" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Issues by Area" subtitle="Active issues grouped by plant area">
          {areaIssues.length === 0 ? (
            <EmptyChart message="No active issues by area" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={areaIssues} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="area"
                  tick={{ fontSize: 10 }}
                  angle={-25}
                  textAnchor="end"
                  height={50}
                  interval={0}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                <Tooltip />
                <Bar dataKey="issues" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </section>
  );
}
