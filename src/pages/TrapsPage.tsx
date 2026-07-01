import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useSteamTrap } from '../store/SteamTrapContext';
import { allTrapViews, sortByPriority } from '../utils/logic';
import { dueLabel } from '../utils/format';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { TrapAlertBadges } from '../components/TrapAlerts';
import { TrapFormModal } from '../components/forms/TrapFormModal';

type Filter = 'All' | 'Issues' | 'Overdue' | 'Upcoming' | 'Healthy' | 'Smart Alerts';

const FILTERS: { key: Filter; match: (v: ReturnType<typeof allTrapViews>[number]) => boolean }[] = [
  { key: 'All', match: () => true },
  { key: 'Issues', match: (v) => v.priority === 'Issue' },
  { key: 'Overdue', match: (v) => v.priority === 'Overdue' },
  { key: 'Upcoming', match: (v) => v.priority === 'Upcoming' },
  { key: 'Healthy', match: (v) => v.priority === 'Healthy' },
  { key: 'Smart Alerts', match: (v) => v.alert_count > 0 },
];

export function TrapsPage() {
  const { data, deleteTrap } = useSteamTrap();
  const traps = useMemo(() => sortByPriority(allTrapViews(data)), [data]);
  const [filter, setFilter] = useState<Filter>('All');
  const [q, setQ] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      All: traps.length,
      Issues: 0,
      Overdue: 0,
      Upcoming: 0,
      Healthy: 0,
      'Smart Alerts': 0,
    };
    for (const t of traps) {
      if (t.priority === 'Issue') c.Issues++;
      else if (t.priority === 'Overdue') c.Overdue++;
      else if (t.priority === 'Upcoming') c.Upcoming++;
      else if (t.priority === 'Healthy') c.Healthy++;
      if (t.alert_count > 0) c['Smart Alerts']++;
    }
    return c;
  }, [traps]);

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    const needle = q.trim().toLowerCase();
    return traps.filter((t) => {
      if (!f.match(t)) return false;
      if (!needle) return true;
      return (
        t.tag.toLowerCase().includes(needle) ||
        t.location.toLowerCase().includes(needle) ||
        t.type.toLowerCase().includes(needle) ||
        t.equipment_name.toLowerCase().includes(needle)
      );
    });
  }, [traps, filter, q]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Traps' }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Traps</h2>
          <p className="text-sm text-slate-500">All steam traps across monitored equipment.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Add Trap
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                filter === f.key
                  ? 'border-maroon-800 bg-maroon-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {f.key} <span className="font-mono text-xs opacity-80">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <input
          className="input max-w-xs"
          placeholder="Search tag, location, type…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Tag</th>
                <th className="px-4 py-2.5">Priority</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Location</th>
                <th className="px-4 py-2.5">Equipment</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Due</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link to={`/traps/${t.id}`} className="font-mono font-semibold text-maroon-800 hover:underline">
                      {t.tag}
                    </Link>
                    {t.alert_count > 0 && (
                      <span className="ml-2">
                        <TrapAlertBadges alerts={t.alerts} compact />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="px-4 py-2.5">{t.type}</td>
                  <td className="px-4 py-2.5">{t.location}</td>
                  <td className="px-4 py-2.5">
                    <Link to={`/equipment/${t.equipment_id}`} className="text-maroon-800 hover:underline">
                      {t.equipment_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={t.status} issueType={t.issue_type} />
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs">{dueLabel(t.days_until_due, t.priority)}</td>
                  <td className="px-4 py-2.5">
                    <button
                      className="text-xs font-semibold text-red-600 hover:underline"
                      onClick={() => {
                        if (confirm(`Delete ${t.tag}?`)) deleteTrap(t.id);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TrapFormModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
