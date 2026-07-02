import { useEffect, useState } from 'react';
import { useSteamTrap } from '../../store/SteamTrapContext';
import { MAINTENANCE_ACTIONS, type MaintenanceAction } from '../../types';
import { Modal } from '../Modal';
import { Field } from '../Field';

interface MaintenanceFormModalProps {
  open: boolean;
  onClose: () => void;
  trapId: string;
  recordId?: string;
}

function todayLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function MaintenanceFormModal({ open, onClose, trapId, recordId }: MaintenanceFormModalProps) {
  const { data, addMaintenance, updateMaintenance } = useSteamTrap();
  const trap = data.traps.find((t) => t.id === trapId);
  const existing = recordId ? data.maintenance_records.find((r) => r.id === recordId) : undefined;

  const [date, setDate] = useState(todayLocal());
  const [action, setAction] = useState<MaintenanceAction>('Maintenance');
  const [technician, setTechnician] = useState('');
  const [description, setDescription] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDate(existing.date);
      setAction(existing.action);
      setTechnician(existing.technician);
      setDescription(existing.description);
      setPartsReplaced(existing.parts_replaced);
      setCost(existing.cost != null ? String(existing.cost) : '');
      setNotes(existing.notes);
    } else {
      setDate(todayLocal());
      setAction('Maintenance');
      setTechnician('');
      setDescription('');
      setPartsReplaced('');
      setCost('');
      setNotes('');
    }
  }, [open, trapId, recordId, existing]);

  const handleSave = () => {
    const input = {
      date,
      action,
      technician,
      description,
      parts_replaced: partsReplaced,
      cost: cost.trim() ? parseFloat(cost) : null,
      notes,
    };

    if (recordId) {
      updateMaintenance(recordId, input);
    } else {
      addMaintenance(trapId, input);
    }
    onClose();
  };

  const canSave = description.trim() !== '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${recordId ? 'Edit' : 'Record'} Maintenance · ${trap?.tag ?? ''}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!canSave}>
            {recordId ? 'Save changes' : 'Save record'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Date">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Action type" required>
          <select className="input" value={action} onChange={(e) => setAction(e.target.value as MaintenanceAction)}>
            {MAINTENANCE_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description" required>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Replaced seat and disc assembly"
          />
        </Field>
        <Field label="Technician">
          <input
            className="input"
            value={technician}
            onChange={(e) => setTechnician(e.target.value)}
            placeholder="e.g. R. Alvarez"
          />
        </Field>
        <Field label="Parts replaced">
          <input
            className="input"
            value={partsReplaced}
            onChange={(e) => setPartsReplaced(e.target.value)}
            placeholder="e.g. Seat/disc kit, gasket set"
          />
        </Field>
        <Field label="Cost (USD)">
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="Optional"
          />
        </Field>
        <Field label="Notes">
          <textarea
            className="input min-h-[80px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
