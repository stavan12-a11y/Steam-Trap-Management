import { useEffect, useState } from 'react';
import { AlertTriangle, Power } from 'lucide-react';
import { useSteamTrap } from '../../store/SteamTrapContext';
import { buildTrapView } from '../../utils/logic';
import { mapInspectionResult } from '../../utils/importTemplate';
import {
  ISSUE_TYPES,
  type InspectionSource,
  type IssueType,
  type TrapStatus,
} from '../../types';
import { Modal } from '../Modal';
import { Field } from '../Field';

type PMOutcome = TrapStatus | 'Shutdown' | 'Custom';

interface PMFormModalProps {
  open: boolean;
  onClose: () => void;
  trapId: string;
  recordId?: string;
  deferralId?: string;
  /** Which inspection program this form belongs to. Defaults to PM. */
  source?: InspectionSource;
}

function todayLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function PMFormModal({
  open,
  onClose,
  trapId,
  recordId,
  deferralId,
  source = 'pm',
}: PMFormModalProps) {
  const { data, addPM, updatePM, addShutdownDeferral, updateShutdownDeferral } = useSteamTrap();
  const trap = data.traps.find((t) => t.id === trapId);
  const equipment = trap ? data.equipment.find((e) => e.id === trap.equipment_id) : undefined;
  const view = trap && equipment ? buildTrapView(data, trap, equipment) : null;
  const existing = recordId ? data.pm_records.find((r) => r.id === recordId) : undefined;
  const existingDeferral = deferralId
    ? data.shutdown_deferrals.find((r) => r.id === deferralId)
    : undefined;

  const effectiveSource: InspectionSource =
    existing?.source ?? (source === 'tlv' ? 'tlv' : 'pm');
  const isTlv = effectiveSource === 'tlv';
  const showShutdownOption = !recordId && !isTlv;

  const [outcome, setOutcome] = useState<PMOutcome>('Working');
  const [date, setDate] = useState(todayLocal());
  const [issueType, setIssueType] = useState<IssueType>(ISSUE_TYPES[0]);
  const [customResult, setCustomResult] = useState('');
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
      setCustomResult('');
    } else if (existing) {
      if (existing.result?.trim()) {
        setOutcome('Custom');
        setCustomResult(existing.result.trim());
      } else {
        setOutcome(existing.status);
        setCustomResult('');
      }
      setDate(existing.date);
      setIssueType(existing.issue_type ?? ISSUE_TYPES[0]);
      setTechnician(existing.technician);
      setNotes(existing.notes);
    } else {
      setOutcome('Working');
      setDate(todayLocal());
      setIssueType(ISSUE_TYPES[0]);
      setCustomResult('');
      setTechnician(isTlv ? 'TLV' : '');
      setNotes('');
    }
    setError(null);
  }, [open, trapId, recordId, deferralId, existing, existingDeferral, isTlv]);

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

    if (outcome === 'Custom') {
      if (!customResult.trim()) {
        setError('Enter a custom inspection result.');
        return;
      }
      const mapped = mapInspectionResult(customResult);
      const input = {
        date,
        status: mapped.status,
        issue_type: mapped.issue_type,
        result: customResult.trim(),
        technician,
        notes,
        source: effectiveSource,
      };
      const res = recordId ? updatePM(recordId, input) : addPM(trapId, input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      return;
    }

    const input = {
      date,
      status: outcome,
      issue_type: outcome === 'Issue' ? issueType : null,
      result: '',
      technician,
      notes,
      source: effectiveSource,
    };

    const res = recordId ? updatePM(recordId, input) : addPM(trapId, input);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
  };

  const isShutdown = outcome === 'Shutdown';
  const isCustom = outcome === 'Custom';
  const kindLabel = isTlv ? 'TLV survey' : 'PM';
  const submitLabel = deferralId || recordId
    ? 'Save changes'
    : isShutdown
      ? 'Record deferral'
      : isTlv
        ? 'Submit TLV survey'
        : 'Submit PM';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${recordId || deferralId ? 'Edit' : 'Record'} ${kindLabel} · ${view?.tag ?? ''}`}
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
            <button
              type="button"
              onClick={() => setOutcome('Custom')}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                outcome === 'Custom'
                  ? 'border-maroon-800 bg-maroon-900 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Custom…
            </button>
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

        {isCustom && (
          <Field label="Custom result" required>
            <input
              className="input"
              value={customResult}
              onChange={(e) => setCustomResult(e.target.value)}
              placeholder='e.g. Cold trap — possible blocked, OK, needs follow-up…'
            />
            <p className="mt-1 text-xs text-slate-500">
              Only clearly good wording (Working, OK, Good, Pass, etc.) counts as working for fleet
              reliability; other text is treated as an issue.
            </p>
          </Field>
        )}

        <Field label="Technician">
          <input
            className="input"
            value={technician}
            onChange={(e) => setTechnician(e.target.value)}
            placeholder={isTlv ? 'e.g. TLV surveyor' : 'e.g. R. Alvarez'}
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
