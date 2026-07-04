import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSteamTrap } from '../store/SteamTrapContext';
import { allTrapViews, repairsListTraps, scheduleListTraps, sortByPriority } from '../utils/logic';
import { dueLabel } from '../utils/format';
import { PriorityBadge } from './Badges';
import { TrapAlertBadges } from './TrapAlerts';

type ListTab = 'schedule' | 'repairs';

const TAB_COPY: Record<ListTab, { description: string; empty: string }> = {
  schedule: {
    description: 'Overdue, due soon, and never-inspected PM',
    empty: 'No traps on the PM schedule need attention.',
  },
  repairs: {
    description: 'Active issues and traps flagged for review',
    empty: 'No traps need repair or follow-up action.',
  },
};

export function PriorityQueuePanel() {
  const { data } = useSteamTrap();
  const [tab, setTab] = useState<ListTab>('schedule');

  const { schedule, repairs } = useMemo(() => {
    const views = sortByPriority(allTrapViews(data));
    return {
      schedule: scheduleListTraps(views),
      repairs: repairsListTraps(views),
    };
  }, [data]);

  const list = tab === 'schedule' ? schedule : repairs;
  const copy = TAB_COPY[tab];

  return (
    <div className="card flex h-full min-h-[480px] flex-col overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">Schedule/Repairs List</h3>
        <div className="mt-2 flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'schedule'
                ? 'bg-white text-maroon-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setTab('schedule')}
          >
            Schedule
            <span className="ml-1.5 font-mono text-[10px] text-slate-500">({schedule.length})</span>
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'repairs'
                ? 'bg-white text-maroon-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setTab('repairs')}
          >
            Repairs
            <span className="ml-1.5 font-mono text-[10px] text-slate-500">({repairs.length})</span>
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">{copy.description}</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {list.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">{copy.empty}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((v) => (
              <li key={v.id}>
                <Link
                  to={`/traps/${v.id}`}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-maroon-800">{v.tag}</span>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <TrapAlertBadges alerts={v.alerts} compact />
                      <PriorityBadge priority={v.priority} />
                    </div>
                  </div>
                  <p className="truncate text-xs text-slate-600">{v.location}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{v.equipment_name}</span>
                    <span className="font-mono">{dueLabel(v.days_until_due, v.priority)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
