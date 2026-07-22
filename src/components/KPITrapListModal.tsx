import { Link } from 'react-router-dom';
import type { TrapView } from '../types';
import { dueLabel } from '../utils/format';
import type { KPIClickKey } from '../utils/kpiFilters';
import { KPI_MODAL_DESCRIPTIONS, KPI_MODAL_TITLES } from '../utils/kpiFilters';
import { Modal } from './Modal';
import { StatusBadge } from './Badges';
import { TrapAlertBadges } from './TrapAlerts';

interface KPITrapListModalProps {
  open: boolean;
  onClose: () => void;
  kpiKey: KPIClickKey | null;
  traps: TrapView[];
}

export function KPITrapListModal({ open, onClose, kpiKey, traps }: KPITrapListModalProps) {
  if (!kpiKey) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={KPI_MODAL_TITLES[kpiKey]}
      description={KPI_MODAL_DESCRIPTIONS[kpiKey]}
      size="lg"
      footer={
        <button type="button" className="btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      {traps.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No traps in this category.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Tag</th>
                <th className="px-3 py-2">Equipment</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Due</th>
              </tr>
            </thead>
            <tbody>
              {traps.map((t) => (
                <tr key={t.id} className="border-b border-slate-100">
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/traps/${t.id}`}
                      className="font-mono font-semibold text-maroon-800 hover:underline"
                      onClick={onClose}
                    >
                      {t.tag}
                    </Link>
                    {t.alert_count > 0 && (
                      <span className="ml-2">
                        <TrapAlertBadges alerts={t.alerts} compact />
                      </span>
                    )}
                    <p className="mt-0.5 text-xs text-slate-500">{t.location}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{t.equipment_name}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={t.status} issueType={t.issue_type} result={t.latest_result} />
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-slate-600">
                    {dueLabel(t.days_until_due, t.priority)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
