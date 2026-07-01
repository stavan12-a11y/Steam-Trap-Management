import { useEffect, useState } from 'react';
import { useSteamTrap } from '../../store/SteamTrapContext';
import { Modal } from '../Modal';
import { Field } from '../Field';

interface EquipmentFormModalProps {
  open: boolean;
  onClose: () => void;
  equipmentId?: string;
}

export function EquipmentFormModal({ open, onClose, equipmentId }: EquipmentFormModalProps) {
  const { getEquipment, addEquipment, updateEquipment } = useSteamTrap();
  const existing = equipmentId ? getEquipment(equipmentId) : undefined;
  const editing = Boolean(existing);

  const [name, setName] = useState('');
  const [area, setArea] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? '');
    setArea(existing?.area ?? '');
  }, [open, existing]);

  const canSave = name.trim() !== '';

  const handleSave = () => {
    if (!canSave) return;
    const payload = {
      name: name.trim(),
      area: area.trim() || 'Unassigned',
    };
    if (editing && existing) updateEquipment(existing.id, payload);
    else addEquipment(payload);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit equipment' : 'Add equipment'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!canSave}>
            {editing ? 'Save changes' : 'Add equipment'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <Field label="Name" required>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Boiler 1"
          />
        </Field>
        <Field label="Area / Plant">
          <input
            className="input"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Utilities"
          />
        </Field>
      </div>
    </Modal>
  );
}
