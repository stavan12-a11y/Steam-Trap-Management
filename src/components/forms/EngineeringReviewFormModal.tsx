import { useEffect, useState } from 'react';
import { useSteamTrap } from '../../store/SteamTrapContext';
import { ENGINEERING_REVIEW_OUTCOMES, type EngineeringReviewOutcome } from '../../types';
import { Modal } from '../Modal';
import { Field } from '../Field';

interface EngineeringReviewFormModalProps {
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

export function EngineeringReviewFormModal({
  open,
  onClose,
  trapId,
  recordId,
}: EngineeringReviewFormModalProps) {
  const { data, addEngineeringReview, updateEngineeringReview } = useSteamTrap();
  const trap = data.traps.find((t) => t.id === trapId);
  const existing = recordId
    ? data.engineering_reviews.find((r) => r.id === recordId)
    : undefined;

  const [reviewDate, setReviewDate] = useState(todayLocal());
  const [reviewer, setReviewer] = useState('');
  const [outcome, setOutcome] = useState<EngineeringReviewOutcome>(
    'Reviewed — continue monitoring',
  );
  const [replacementManufacturer, setReplacementManufacturer] = useState('');
  const [replacementModel, setReplacementModel] = useState('');
  const [replacementNotes, setReplacementNotes] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setReviewDate(existing.review_date);
      setReviewer(existing.reviewer);
      setOutcome(existing.outcome);
      setReplacementManufacturer(existing.replacement_manufacturer);
      setReplacementModel(existing.replacement_model);
      setReplacementNotes(existing.replacement_notes);
      setNotes(existing.notes);
    } else {
      setReviewDate(todayLocal());
      setReviewer('');
      setOutcome('Reviewed — continue monitoring');
      setReplacementManufacturer('');
      setReplacementModel('');
      setReplacementNotes('');
      setNotes('');
    }
  }, [open, trapId, recordId, existing]);

  const showReplacementFields = outcome === 'Trap replaced';

  const handleSave = () => {
    const input = {
      review_date: reviewDate,
      reviewer,
      outcome,
      replacement_manufacturer: showReplacementFields ? replacementManufacturer : '',
      replacement_model: showReplacementFields ? replacementModel : '',
      replacement_notes: showReplacementFields ? replacementNotes : '',
      notes,
    };

    if (recordId) {
      updateEngineeringReview(recordId, input);
    } else {
      addEngineeringReview(trapId, input);
    }
    onClose();
  };

  const canSave = reviewer.trim() !== '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${recordId ? 'Edit' : 'Record'} Engineering Review · ${trap?.tag ?? ''}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!canSave}>
            {recordId ? 'Save changes' : 'Save review'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Document that engineering has reviewed this trap. The review alert clears until three or
          more new failures accumulate after the review date.
        </p>
        <Field label="Review date" required>
          <input
            type="date"
            className="input"
            value={reviewDate}
            onChange={(e) => setReviewDate(e.target.value)}
          />
        </Field>
        <Field label="Reviewer" required>
          <input
            className="input"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder="e.g. J. Rivera, Reliability Engineer"
          />
        </Field>
        <Field label="Outcome" required>
          <select
            className="input"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as EngineeringReviewOutcome)}
          >
            {ENGINEERING_REVIEW_OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        {showReplacementFields && (
          <>
            <Field label="Replacement manufacturer">
              <input
                className="input"
                value={replacementManufacturer}
                onChange={(e) => setReplacementManufacturer(e.target.value)}
                placeholder="e.g. Spirax Sarco"
              />
            </Field>
            <Field label="Replacement model">
              <input
                className="input"
                value={replacementModel}
                onChange={(e) => setReplacementModel(e.target.value)}
                placeholder="e.g. FT-14"
              />
            </Field>
            <Field label="Replacement notes">
              <textarea
                className="input min-h-[72px] resize-y"
                value={replacementNotes}
                onChange={(e) => setReplacementNotes(e.target.value)}
                placeholder="Sizing, connection, or installation details"
              />
            </Field>
          </>
        )}
        <Field label="Notes">
          <textarea
            className="input min-h-[80px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Findings, recommendations, or follow-up actions"
          />
        </Field>
      </div>
    </Modal>
  );
}
