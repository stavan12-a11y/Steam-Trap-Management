import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  operatingConditionBreakdown,
  pmScheduleBreakdown,
  type StatusSlice,
} from '../utils/logic';

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card flex flex-col p-4">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="min-h-[260px] flex-1">{children}</div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">{message}</div>
  );
}

function StatusTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: StatusSlice }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-slate-900">{item.name}</p>
      <p className="text-slate-600">
        {item.value} trap{item.value !== 1 ? 's' : ''}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
    </div>
  );
}

function MiniDonut({ title, subtitle, slices }: { title: string; subtitle: string; slices: StatusSlice[] }) {
  if (slices.length === 0) {
    return (
      <div>
        <p className="text-xs font-bold text-slate-700">{title}</p>
        <p className="text-[11px] text-slate-400">{subtitle}</p>
        <EmptyChart message="No data" />
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-bold text-slate-700">{title}</p>
      <p className="mb-2 text-[11px] text-slate-400">{subtitle}</p>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={38}
            outerRadius={62}
            paddingAngle={2}
          >
            {slices.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<StatusTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-1 space-y-1">
        {slices.map((slice) => (
          <li key={slice.name} className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="font-semibold text-slate-700">{slice.name}</span>
            <span className="font-mono text-slate-500">({slice.value})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function KPIChartsPanel() {
  const { data } = useSteamTrap();
  const views = useMemo(() => allTrapViews(data), [data]);
  const operating = useMemo(() => operatingConditionBreakdown(views), [views]);
  const pmSchedule = useMemo(() => pmScheduleBreakdown(views), [views]);
  const issueTypes = useMemo(() => activeIssuesByType(views), [views]);
  const areaIssues = useMemo(() => issuesByArea(views).filter((a) => a.issues > 0), [views]);

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Fleet Analytics</h3>
        <p className="text-sm text-slate-500">Visual breakdown for trend analysis and planning.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Operating vs PM Schedule"
          subtitle="Two independent views — a trap can be failing but PM on track if inspected recently"
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <MiniDonut
              title="Operating Condition"
              subtitle="What did the last inspection find?"
              slices={operating}
            />
            <MiniDonut
              title="PM Schedule"
              subtitle="When is the next inspection due?"
              slices={pmSchedule}
            />
          </div>
        </ChartCard>

        <ChartCard title="Active Issues by Type" subtitle="Current open issues only">
          {issueTypes.length === 0 ? (
            <EmptyChart message="No active issues" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
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

        <ChartCard title="Issues by Area" subtitle="Active issues grouped by plant area">
          {areaIssues.length === 0 ? (
            <EmptyChart message="No active issues by area" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={areaIssues} margin={{ bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="area"
                  tick={{ fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  height={56}
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
