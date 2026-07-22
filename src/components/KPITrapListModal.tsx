import type { TrapView } from '../types';
import type { KPIClickKey } from '../utils/kpiFilters';
import { KPI_MODAL_DESCRIPTIONS, KPI_MODAL_TITLES } from '../utils/kpiFilters';
import { TrapListModal } from './TrapListModal';

interface KPITrapListModalProps {
  open: boolean;
  onClose: () => void;
  kpiKey: KPIClickKey | null;
  traps: TrapView[];
}

export function KPITrapListModal({ open, onClose, kpiKey, traps }: KPITrapListModalProps) {
  if (!kpiKey) return null;

  return (
    <TrapListModal
      open={open}
      onClose={onClose}
      title={KPI_MODAL_TITLES[kpiKey]}
      description={KPI_MODAL_DESCRIPTIONS[kpiKey]}
      traps={traps}
    />
  );
}
