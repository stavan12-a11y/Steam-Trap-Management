import { useEffect, useState } from 'react';
import { useSteamTrap } from '../../store/SteamTrapContext';
import { TRAP_TYPES, type TrapTypeName } from '../../types';
import { Modal } from '../Modal';
import { Field } from '../Field';

interface TrapFormModalProps {
  open: boolean;
  onClose: () => void;
  defaultEquipmentId?: string;
}

export function TrapFormModal({ open, onClose, defaultEquipmentId }: TrapFormModalProps) {
  const { data, addTrap } = useSteamTrap();
  const [tag, setTag] = useState('');
  const [type, setType] = useState<TrapTypeName>(TRAP_TYPES[0]);
  const [location, setLocation] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTag('');
    setType(TRAP_TYPES[0]);
    setLocation('');
    setEquipmentId(defaultEquipmentId ?? data.equipment[0]?.id ?? '');
    setError(null);
  }, [open, defaultEquipmentId, data.equipment]);

  const canSave = tag.trim() !== '' && equipmentId !== '';

  const handleSave = () => {
    if (!canSave) return;
    if (data.traps.some((t) => t.tag.toLowerCase() === tag.trim().toLowerCase())) {
      setError(`Tag ${tag} already exists.`);
      return;
    }
    addTrap({
      tag: tag.trim(),
      type,
      location: location.trim() || 'Unspecified',
      equipment_id: equipmentId,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add trap"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!canSave}>
            Add trap
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {error && <p className="text-sm font-medium text-red-600 sm:col-span-2">{error}</p>}
        <Field label="Tag" required>
          <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="ST-0017" />
        </Field>
        <Field label="Type" required>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as TrapTypeName)}>
            {TRAP_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Equipment" required>
          <select className="input" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
            {data.equipment.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location">
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Boiler 1 — Drip leg"
          />
        </Field>
      </div>
    </Modal>
  );
}
