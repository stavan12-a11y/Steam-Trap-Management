import { useSteamTrap } from '../store/SteamTrapContext';
import { AlertTriangle, Check, Cloud, Loader2 } from 'lucide-react';

export function SyncIndicator() {
  const { syncStatus } = useSteamTrap();

  if (syncStatus === 'local') return null;

  const config = {
    loading: { icon: Loader2, text: 'Loading…', spin: true, cls: 'text-maroon-100' },
    saving: { icon: Loader2, text: 'Saving…', spin: true, cls: 'text-maroon-100' },
    saved: { icon: Check, text: 'Synced', spin: false, cls: 'text-emerald-200' },
    error: { icon: AlertTriangle, text: 'Sync error', spin: false, cls: 'text-amber-200' },
  }[syncStatus];

  const Icon = config.icon;

  return (
    <span
      className={`hidden items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold sm:inline-flex ${config.cls}`}
      title={
        syncStatus === 'error'
          ? 'Could not reach the cloud database. Your latest change may not be saved.'
          : 'Shared cloud data'
      }
    >
      {syncStatus === 'saved' ? (
        <Cloud className="h-3.5 w-3.5" />
      ) : (
        <Icon className={`h-3.5 w-3.5 ${config.spin ? 'animate-spin' : ''}`} />
      )}
      {config.text}
    </span>
  );
}
