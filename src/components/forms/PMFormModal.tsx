import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useSteamTrap } from '../../store/SteamTrapContext';
import { buildTrapView } from '../../utils/logic';
import { ISSUE_TYPES, type IssueType, type TrapStatus } from '../../types';
import { Modal } from '../Modal';
import { Field } from '../Field';

interface PMFormModalProps {
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

export function PMFormModal({ open, onClose, trapId, recordId }: PMFormModalProps) {
  const { data, addPM, updatePM } = useSteamTrap();
  const trap = data.traps.find((t) => t.id === trapId);
  const equipment = trap ? data.equipment.find((e) => e.id === trap.equipment_id) : undefined;
  const view = trap && equipment ? buildTrapView(data, trap, equipment) : null;
  const existing = recordId ? data.pm_records.find((r) => r.id === recordId) : undefined;

  const [date, setDate] = useState(todayLocal());
  const [status, setStatus] = useState<TrapStatus>('Working');
  const [issueType, setIssueType] = useState<IssueType>(ISSUE_TYPES[0]);
  const [technician, setTechnician] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDate(existing.date);
      setStatus(existing.status);
      setIssueType(existing.issue_type ?? ISSUE_TYPES[0]);
      setTechnician(existing.technician);
      setNotes(existing.notes);
    } else {
      setDate(todayLocal());
      setStatus('Working');
      setIssueType(ISSUE_TYPES[0]);
      setTechnician('');
      setNotes('');
    }
    setError(null);
  }, [open, trapId, recordId, existing]);

  const handleSave = () => {
    setError(null);
    const input = {
      date,
      status,
      issue_type: status === 'Issue' ? issueType : null,
      technician,
      notes,
    };

    const res = recordId ? updatePM(recordId, input) : addPM(trapId, input);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${recordId ? 'Edit' : 'Record'} PM · ${view?.tag ?? ''}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {recordId ? 'Save changes' : 'Submit PM'}
          </button>
        </>
      }
    >
      {error && (
        <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-red-600">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </p>
      )}
      <div className="space-y-4">
        <Field label="Inspection date">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div>
          <span className="label">Status</span>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300">
            {(['Working', 'Issue'] as TrapStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-4 py-2 text-sm font-semibold ${
                  status === s
                    ? s === 'Working'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-red-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {status === 'Issue' && (
          <Field label="Issue type" required>
            <select
              className="input"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value as IssueType)}
            >
              {ISSUE_TYPES.map((it) => (
                <option key={it} value={it}>
                  {it}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Technician">
          <input
            className="input"
            value={technician}
            onChange={(e) => setTechnician(e.target.value)}
            placeholder="e.g. R. Alvarez"
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
