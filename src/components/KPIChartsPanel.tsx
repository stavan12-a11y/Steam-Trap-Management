import { useMemo, useState } from 'react';
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
  issuesByEquipment,
  pmScheduleBreakdown,
  trapsForEquipmentIssues,
  trapsForIssueType,
  type StatusSlice,
} from '../utils/logic';
import { TrapListModal } from './TrapListModal';

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
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
    <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">{message}</div>
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

function PmScheduleLegend({ slices }: { slices: StatusSlice[] }) {
  return (
    <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
      {slices.map((slice) => (
        <li key={slice.name} className="flex items-start gap-2 text-xs">
          <span
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: slice.color }}
          />
          <span>
            <span className="font-semibold text-slate-700">{slice.name}</span>
            <span className="mx-1 font-mono text-slate-500">({slice.value})</span>
            <span className="text-slate-500">— {slice.description}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

type ChartDrilldown =
  | { kind: 'issue_type'; label: string }
  | { kind: 'equipment'; label: string };

export function KPIChartsPanel() {
  const { data } = useSteamTrap();
  const views = useMemo(() => allTrapViews(data), [data]);
  const pmSchedule = useMemo(() => pmScheduleBreakdown(views), [views]);
  const issueTypes = useMemo(() => activeIssuesByType(views), [views]);
  const equipmentIssues = useMemo(
    () => issuesByEquipment(views).filter((e) => e.issues > 0),
    [views],
  );
  const [drilldown, setDrilldown] = useState<ChartDrilldown | null>(null);

  const drilldownTraps = useMemo(() => {
    if (!drilldown) return [];
    if (drilldown.kind === 'issue_type') return trapsForIssueType(views, drilldown.label);
    return trapsForEquipmentIssues(views, drilldown.label);
  }, [drilldown, views]);

  const drilldownTitle =
    drilldown?.kind === 'issue_type'
      ? `Issues: ${drilldown.label}`
      : drilldown?.kind === 'equipment'
        ? `Issues: ${drilldown.label}`
        : '';

  const drilldownDescription =
    drilldown?.kind === 'issue_type'
      ? 'Active-issue traps with this result / issue type.'
      : drilldown?.kind === 'equipment'
        ? 'Active-issue traps on this equipment.'
        : undefined;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Fleet Analytics</h3>
        <p className="text-sm text-slate-500">
          Visual breakdown for trend analysis and planning. Click a bar to see the traps in that
          category.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="PM Schedule">
          {pmSchedule.length === 0 ? (
            <EmptyChart message="No traps to display" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pmSchedule}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {pmSchedule.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<StatusTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <PmScheduleLegend slices={pmSchedule} />
            </>
          )}
        </ChartCard>

        <ChartCard
          title="Active Issues by Type"
          subtitle="Click a bar to list traps — sorted by frequency"
        >
          {issueTypes.length === 0 ? (
            <EmptyChart message="No active issues" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(260, issueTypes.length * 36)}>
              <BarChart
                data={issueTypes}
                layout="vertical"
                margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="type"
                  width={120}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value: string) =>
                    value.length > 18 ? `${value.slice(0, 16)}…` : value
                  }
                />
                <Tooltip
                  formatter={(value) => [`${value}`, 'Count']}
                  labelFormatter={(label) => `${String(label)} · click to view traps`}
                />
                <Bar
                  dataKey="count"
                  name="Count"
                  fill="#dc2626"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(item) => {
                    const row = item as { type?: string; payload?: { type?: string } };
                    const type = row.payload?.type ?? row.type;
                    if (type) setDrilldown({ kind: 'issue_type', label: type });
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Issues by Equipment"
          subtitle="Click a bar to list traps on that equipment"
        >
          {equipmentIssues.length === 0 ? (
            <EmptyChart message="No active issues by equipment" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={equipmentIssues} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="equipment" width={110} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value) => [`${value}`, 'Issues']}
                  labelFormatter={(label) => `${String(label)} · click to view traps`}
                />
                <Bar
                  dataKey="issues"
                  fill="#d97706"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(item) => {
                    const row = item as {
                      equipment?: string;
                      payload?: { equipment?: string };
                    };
                    const equipment = row.payload?.equipment ?? row.equipment;
                    if (equipment) setDrilldown({ kind: 'equipment', label: equipment });
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <TrapListModal
        open={drilldown !== null}
        onClose={() => setDrilldown(null)}
        title={drilldownTitle}
        description={drilldownDescription}
        traps={drilldownTraps}
      />
    </section>
  );
}
