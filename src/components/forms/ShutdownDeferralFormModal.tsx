import { useEffect, useState } from 'react';
import { useSteamTrap } from '../../store/SteamTrapContext';
import { buildTrapView } from '../../utils/logic';
import { Modal } from '../Modal';
import { Field } from '../Field';

interface ShutdownDeferralFormModalProps {
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

export function ShutdownDeferralFormModal({
  open,
  onClose,
  trapId,
  recordId,
}: ShutdownDeferralFormModalProps) {
  const { data, addShutdownDeferral, updateShutdownDeferral } = useSteamTrap();
  const trap = data.traps.find((t) => t.id === trapId);
  const equipment = trap ? data.equipment.find((e) => e.id === trap.equipment_id) : undefined;
  const view = trap && equipment ? buildTrapView(data, trap, equipment) : null;
  const existing = recordId ? data.shutdown_deferrals.find((r) => r.id === recordId) : undefined;

  const [recordedDate, setRecordedDate] = useState(todayLocal());
  const [pmDueDate, setPmDueDate] = useState('');
  const [technician, setTechnician] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setRecordedDate(existing.recorded_date);
      setPmDueDate(existing.pm_due_date);
      setTechnician(existing.technician);
      setNotes(existing.notes);
    } else {
      setRecordedDate(todayLocal());
      setPmDueDate(view?.next_pm_date ?? todayLocal());
      setTechnician('');
      setNotes('');
    }
  }, [open, trapId, recordId, existing, view?.next_pm_date]);

  const handleSave = () => {
    const input = {
      recorded_date: recordedDate,
      pm_due_date: pmDueDate,
      technician,
      notes,
    };

    if (recordId) {
      updateShutdownDeferral(recordId, input);
    } else {
      addShutdownDeferral(trapId, input);
    }
    onClose();
  };

  const canSave = notes.trim() !== '' && pmDueDate.trim() !== '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${recordId ? 'Edit' : 'Record'} Shutdown Deferral · ${view?.tag ?? ''}`}
      description={
        recordId
          ? undefined
          : `Equipment: ${view?.equipment_name ?? '—'}. PM schedule is unchanged — next inspection remains ${view?.next_pm_date ?? '—'}.`
      }
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!canSave}>
            {recordId ? 'Save changes' : 'Record deferral'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Recorded date">
          <input
            type="date"
            className="input"
            value={recordedDate}
            onChange={(e) => setRecordedDate(e.target.value)}
          />
        </Field>
        <Field label="PM due date at time of deferral" required>
          <input
            type="date"
            className="input"
            value={pmDueDate}
            onChange={(e) => setPmDueDate(e.target.value)}
          />
        </Field>
        <Field label="Technician">
          <input
            className="input"
            value={technician}
            onChange={(e) => setTechnician(e.target.value)}
            placeholder="e.g. M. Chen"
          />
        </Field>
        <Field label="Shutdown reason / notes" required>
          <textarea
            className="input min-h-[100px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Crude preheat train outage — PM deferred until equipment returns to service."
          />
        </Field>
      </div>
    </Modal>
  );
}
