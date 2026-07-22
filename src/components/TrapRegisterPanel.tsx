import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TrapView } from '../types';
import { PriorityBadge } from './Badges';

function display(value: string | null | undefined): string {
  return value?.trim() ? value : '—';
}

interface TrapRegisterPanelProps {
  traps: TrapView[];
}

export function TrapRegisterPanel({ traps }: TrapRegisterPanelProps) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return traps;
    return traps.filter((t) =>
      [
        t.equipment_area,
        t.equipment_name,
        t.tag,
        t.location,
        t.orientation,
        t.line_pressure,
        t.model,
        t.trap_size,
        t.connection_type,
        t.type,
        t.manufacturer,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [traps, q]);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Trap Register</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Area, equipment, and trap datasheet fields from your uploaded workbook.
          </p>
        </div>
        <input
          className="input max-w-xs"
          placeholder="Search register…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {traps.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-500">
          No traps yet. Import the Excel template to populate this register.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5">Area</th>
                <th className="px-3 py-2.5">Equipment</th>
                <th className="px-3 py-2.5">Trap ID</th>
                <th className="px-3 py-2.5">Location</th>
                <th className="px-3 py-2.5">Orientation</th>
                <th className="px-3 py-2.5">Line pressure</th>
                <th className="px-3 py-2.5">Trap model</th>
                <th className="px-3 py-2.5">Size (inch)</th>
                <th className="px-3 py-2.5">Trap connection</th>
                <th className="px-3 py-2.5">Trap type</th>
                <th className="px-3 py-2.5">Manufacturer</th>
                <th className="px-3 py-2.5">Priority</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2.5 text-slate-700">{display(t.equipment_area)}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/equipment/${t.equipment_id}`}
                      className="font-medium text-maroon-800 hover:underline"
                    >
                      {t.equipment_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/traps/${t.id}`}
                      className="font-mono font-semibold text-maroon-800 hover:underline"
                    >
                      {t.tag}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{display(t.location)}</td>
                  <td className="px-3 py-2.5 text-slate-700">{display(t.orientation)}</td>
                  <td className="px-3 py-2.5 text-slate-700">{display(t.line_pressure)}</td>
                  <td className="px-3 py-2.5 text-slate-700">{display(t.model)}</td>
                  <td className="px-3 py-2.5 text-slate-700">{display(t.trap_size)}</td>
                  <td className="px-3 py-2.5 text-slate-700">{display(t.connection_type)}</td>
                  <td className="px-3 py-2.5 text-slate-700">{t.type}</td>
                  <td className="px-3 py-2.5 text-slate-700">{display(t.manufacturer)}</td>
                  <td className="px-3 py-2.5">
                    <PriorityBadge priority={t.priority} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-sm text-slate-500">
                    No traps match “{q}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
