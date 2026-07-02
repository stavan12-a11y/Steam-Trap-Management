import { useEffect, useState } from 'react';
import { AlertTriangle, Power } from 'lucide-react';
import { useSteamTrap } from '../../store/SteamTrapContext';
import { buildTrapView, canRecordShutdownDeferral } from '../../utils/logic';
import { ISSUE_TYPES, type IssueType, type TrapStatus } from '../../types';
import { Modal } from '../Modal';
import { Field } from '../Field';

type PMOutcome = TrapStatus | 'Shutdown';

interface PMFormModalProps {
  open: boolean;
  onClose: () => void;
  trapId: string;
  recordId?: string;
  deferralId?: string;
}

function todayLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function PMFormModal({ open, onClose, trapId, recordId, deferralId }: PMFormModalProps) {
  const { data, addPM, updatePM, addShutdownDeferral, updateShutdownDeferral } = useSteamTrap();
  const trap = data.traps.find((t) => t.id === trapId);
  const equipment = trap ? data.equipment.find((e) => e.id === trap.equipment_id) : undefined;
  const view = trap && equipment ? buildTrapView(data, trap, equipment) : null;
  const existing = recordId ? data.pm_records.find((r) => r.id === recordId) : undefined;
  const existingDeferral = deferralId
    ? data.shutdown_deferrals.find((r) => r.id === deferralId)
    : undefined;

  const showShutdownOption =
    !recordId && (deferralId ? true : view ? canRecordShutdownDeferral(view) : false);

  const [outcome, setOutcome] = useState<PMOutcome>('Working');
  const [date, setDate] = useState(todayLocal());
  const [issueType, setIssueType] = useState<IssueType>(ISSUE_TYPES[0]);
  const [technician, setTechnician] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existingDeferral) {
      setOutcome('Shutdown');
      setDate(existingDeferral.recorded_date);
      setTechnician(existingDeferral.technician);
      setNotes(existingDeferral.notes);
    } else if (existing) {
      setOutcome(existing.status);
      setDate(existing.date);
      setIssueType(existing.issue_type ?? ISSUE_TYPES[0]);
      setTechnician(existing.technician);
      setNotes(existing.notes);
    } else {
      setOutcome('Working');
      setDate(todayLocal());
      setIssueType(ISSUE_TYPES[0]);
      setTechnician('');
      setNotes('');
    }
    setError(null);
  }, [open, trapId, recordId, deferralId, existing, existingDeferral]);

  const handleSave = () => {
    setError(null);

    if (outcome === 'Shutdown') {
      if (!notes.trim()) {
        setError('Please describe why the PM is deferred (equipment shutdown reason).');
        return;
      }
      const input = {
        recorded_date: date,
        pm_due_date: existingDeferral?.pm_due_date ?? view?.next_pm_date ?? date,
        technician,
        notes,
      };
      if (deferralId) {
        updateShutdownDeferral(deferralId, input);
      } else {
        addShutdownDeferral(trapId, input);
      }
      onClose();
      return;
    }

    const input = {
      date,
      status: outcome,
      issue_type: outcome === 'Issue' ? issueType : null,
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

  const isShutdown = outcome === 'Shutdown';
  const submitLabel = deferralId || recordId ? 'Save changes' : isShutdown ? 'Record deferral' : 'Submit PM';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${recordId || deferralId ? 'Edit' : 'Record'} PM · ${view?.tag ?? ''}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {submitLabel}
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
        <Field label={isShutdown ? 'Recorded date' : 'Inspection date'}>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div>
          <span className="label">Outcome</span>
          <div className="flex flex-wrap gap-2">
            {(['Working', 'Issue'] as TrapStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setOutcome(s)}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                  outcome === s
                    ? s === 'Working'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-red-600 bg-red-600 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s}
              </button>
            ))}
            {showShutdownOption && (
              <button
                type="button"
                onClick={() => setOutcome('Shutdown')}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold ${
                  outcome === 'Shutdown'
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Power className="h-3.5 w-3.5" />
                Equipment Shutdown
              </button>
            )}
          </div>
        </div>

        {isShutdown && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
            <p>
              PM deferred because <span className="font-medium">{view?.equipment_name}</span> is under
              shutdown. Next PM date ({view?.next_pm_date ?? '—'}) is unchanged.
            </p>
          </div>
        )}

        {outcome === 'Issue' && (
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
        <Field label={isShutdown ? 'Shutdown reason / notes' : 'Notes'} required={isShutdown}>
          <textarea
            className="input min-h-[80px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isShutdown
                ? 'e.g. Crude preheat train outage — PM deferred until equipment returns to service.'
                : undefined
            }
          />
        </Field>
      </div>
    </Modal>
  );
}
