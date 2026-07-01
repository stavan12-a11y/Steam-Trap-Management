import { useState } from 'react';
import { useSteamTrap } from '../store/SteamTrapContext';
import type { TrapTypeName } from '../types';
import { Breadcrumbs } from '../components/Breadcrumbs';

export function SettingsPage() {
  const { data, updateTrapTypeInterval, resetToSeed } = useSteamTrap();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(data.trap_types.map((t) => [t.type, String(t.pm_interval_days)])),
  );

  const save = (type: TrapTypeName) => {
    const interval = Number(values[type]);
    if (!Number.isFinite(interval) || interval < 1) return;
    updateTrapTypeInterval(type, interval);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Settings' }]} />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500">Configure PM intervals and manage demo data.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            PM Intervals by Trap Type
          </h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Trap Type</th>
              <th className="px-4 py-2.5">Interval (days)</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {data.trap_types.map((t) => (
              <tr key={t.type} className="border-b border-slate-100">
                <td className="px-4 py-3 font-semibold">{t.type}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={1}
                    className="input max-w-[140px] font-mono"
                    value={values[t.type] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [t.type]: e.target.value }))}
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    className="btn-primary text-xs"
                    onClick={() => save(t.type)}
                    disabled={values[t.type] === String(t.pm_interval_days)}
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Demo Data</h3>
        <p className="mt-2 text-sm text-slate-500">
          Restore the application to its seeded demonstration dataset.
        </p>
        <button
          className="btn-secondary mt-4 text-red-700"
          onClick={() => {
            if (confirm('Reset all data to the demo dataset?')) resetToSeed();
          }}
        >
          Reset Demo Data
        </button>
      </div>
    </div>
  );
}
