import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSteamTrap } from '../store/SteamTrapContext';
import { allTrapViews, sortByPriority } from '../utils/logic';
import { dueLabel } from '../utils/format';
import { PriorityBadge } from './Badges';

export function PriorityQueuePanel() {
  const { data } = useSteamTrap();

  const queue = useMemo(
    () =>
      sortByPriority(allTrapViews(data))
        .filter((v) => v.priority !== 'Healthy')
        .slice(0, 10),
    [data],
  );

  return (
    <div className="card flex h-full min-h-[480px] flex-col overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">Priority Action Queue</h3>
        <p className="text-xs text-slate-500">Top 10 · most urgent first</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            No outstanding actions — the whole fleet is healthy.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {queue.map((v) => (
              <li key={v.id}>
                <Link
                  to={`/traps/${v.id}`}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-maroon-800">{v.tag}</span>
                    <PriorityBadge priority={v.priority} />
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
