import { PM_INTERVAL_DAYS } from '../utils/logic';
import { Breadcrumbs } from '../components/Breadcrumbs';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Settings' }]} />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500">Application configuration.</p>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">PM Schedule</h3>
        <p className="mt-2 text-sm text-slate-600">
          All trap types use a uniform preventive maintenance interval of{' '}
          <span className="font-semibold">{PM_INTERVAL_DAYS} days (3 months)</span>. Next PM is
          calculated from the last inspection date.
        </p>
      </div>
    </div>
  );
}
