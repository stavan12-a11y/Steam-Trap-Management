import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, Upload } from 'lucide-react';
import { useSteamTrap } from '../store/SteamTrapContext';
import {
  downloadTrapImportTemplate,
  parseTrapImportFile,
  type ImportMode,
  type ImportParseError,
  type ParsedTrapImport,
} from '../utils/importTemplate';
import { Modal } from './Modal';

interface ImportDataModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'prep' | 'preview' | 'done';

export function ImportDataModal({ open, onClose }: ImportDataModalProps) {
  const { data, importTrapRegister } = useSteamTrap();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('prep');
  const [mode, setMode] = useState<ImportMode>('merge');
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedTrapImport | null>(null);
  const [parseFatal, setParseFatal] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep('prep');
    setMode('merge');
    setParsing(false);
    setFileName(null);
    setParsed(null);
    setParseFatal(null);
    setResultSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [open]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setParsing(true);
    setParseFatal(null);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseTrapImportFile(buffer, file.name);
      setParsed(result);
      setStep('preview');
    } catch (err) {
      setParsed(null);
      setParseFatal(err instanceof Error ? err.message : 'Could not read that file.');
      setStep('preview');
    } finally {
      setParsing(false);
    }
  };

  const canImport = Boolean(parsed && parsed.rows.length > 0 && !parseFatal);

  const handleImport = () => {
    if (!parsed || parsed.rows.length === 0) return;
    if (mode === 'replace') {
      const ok = confirm(
        'Replace mode will delete all current equipment, traps, and history, then import only the rows in this file. Continue?',
      );
      if (!ok) return;
    }

    const result = importTrapRegister(parsed.rows, mode);
    const parts = [
      `${result.trapsCreated} trap${result.trapsCreated === 1 ? '' : 's'} added`,
      `${result.trapsUpdated} updated`,
      `${result.equipmentCreated} equipment created`,
      `${result.inspectionsCreated} inspection${result.inspectionsCreated === 1 ? '' : 's'} imported`,
    ];
    setResultSummary(parts.join(' · '));
    setStep('done');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import trap data"
      description="Download the Excel template, fill in your traps, then upload the file."
      size="lg"
      footer={
        step === 'done' ? (
          <button type="button" className="btn-primary" onClick={onClose}>
            Done
          </button>
        ) : step === 'preview' ? (
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setStep('prep');
                setParsed(null);
                setParseFatal(null);
                setFileName(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              Back
            </button>
            <button type="button" className="btn-primary" disabled={!canImport} onClick={handleImport}>
              <Upload className="h-4 w-4" />
              Import {parsed?.rows.length ?? 0} trap{(parsed?.rows.length ?? 0) === 1 ? '' : 's'}
            </button>
          </>
        ) : (
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        )
      }
    >
      {step === 'prep' && (
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold text-slate-900">1. Download template</h3>
            <p className="mt-1 text-sm text-slate-600">
              The workbook includes a <span className="font-semibold">Traps</span> sheet with
              datasheet columns plus optional <span className="font-semibold">Inspection Date</span>,{' '}
              <span className="font-semibold">Inspection Result</span>, and{' '}
              <span className="font-semibold">Inspection Notes</span> (shown in Inspection History).
              Any text values are accepted on upload.
            </p>
            <button type="button" className="btn-primary mt-3" onClick={downloadTrapImportTemplate}>
              <Download className="h-4 w-4" />
              Download Excel template
            </button>
          </section>

          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-900">2. Choose import mode</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <ModeCard
                selected={mode === 'merge'}
                title="Merge"
                description="Add new traps and update existing ones that share the same Trap Tag. Keeps current history."
                onSelect={() => setMode('merge')}
              />
              <ModeCard
                selected={mode === 'replace'}
                title="Replace all"
                description="Clear demo/current data, then load only what is in your file. Best for first-time uploads."
                onSelect={() => setMode('replace')}
              />
            </div>
            {mode === 'replace' && data.traps.length > 0 && (
              <p className="mt-3 flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                You currently have {data.traps.length} trap{data.traps.length === 1 ? '' : 's'}. Replace
                will remove them and all PM/maintenance history.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-dashed border-maroon-300 bg-maroon-50/40 p-4">
            <h3 className="text-sm font-bold text-slate-900">3. Upload filled workbook</h3>
            <p className="mt-1 text-sm text-slate-600">
              Accepts <span className="font-semibold">.xlsx</span>, <span className="font-semibold">.xls</span>,
              or <span className="font-semibold">.csv</span>. Required columns: Trap ID, Trap Type, Equipment.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className="btn-secondary mt-3"
              disabled={parsing}
              onClick={() => fileInputRef.current?.click()}
            >
              {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {parsing ? 'Reading file…' : 'Choose file…'}
            </button>
          </section>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          {fileName && (
            <p className="text-sm text-slate-600">
              File: <span className="font-semibold text-slate-900">{fileName}</span>
              <span className="mx-2 text-slate-300">·</span>
              Mode: <span className="font-semibold text-slate-900">{mode === 'merge' ? 'Merge' : 'Replace all'}</span>
            </p>
          )}

          {parseFatal && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {parseFatal}
            </div>
          )}

          {parsed && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Ready to import" value={parsed.rows.length} tone="good" />
                <Stat label="Row errors" value={parsed.errors.length} tone={parsed.errors.length ? 'bad' : 'neutral'} />
                <Stat
                  label="Warnings"
                  value={parsed.warnings.length}
                  tone={parsed.warnings.length ? 'warn' : 'neutral'}
                />
                <Stat
                  label="Mode"
                  value={mode === 'merge' ? 'Merge' : 'Replace'}
                  tone="neutral"
                  isText
                />
              </div>

              {parsed.rows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Trap ID</th>
                        <th className="px-3 py-2 font-semibold">Type</th>
                        <th className="px-3 py-2 font-semibold">Equipment</th>
                        <th className="px-3 py-2 font-semibold">Inspection</th>
                        <th className="px-3 py-2 font-semibold">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 8).map((r) => (
                        <tr key={`${r.tag}-${r.rowNumber}`} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-900">{r.tag}</td>
                          <td className="px-3 py-2 text-slate-600">{r.type}</td>
                          <td className="px-3 py-2 text-slate-600">{r.equipment_name}</td>
                          <td className="px-3 py-2 text-slate-600">{r.inspection_date ?? '—'}</td>
                          <td className="px-3 py-2 text-slate-600">{r.inspection_result || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.rows.length > 8 && (
                    <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                      Showing first 8 of {parsed.rows.length} traps.
                    </p>
                  )}
                </div>
              )}

              <IssueList title="Errors (these rows will be skipped)" items={parsed.errors} tone="bad" />
              <IssueList title="Warnings" items={parsed.warnings} tone="warn" />

              {parsed.rows.length === 0 && !parseFatal && (
                <p className="text-sm text-slate-600">
                  No valid trap rows found. Check the template headers and required fields, then try again.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <h3 className="text-lg font-bold text-slate-900">Import complete</h3>
          {resultSummary && <p className="text-sm text-slate-600">{resultSummary}</p>}
          <p className="max-w-md text-sm text-slate-500">
            Your traps are now on the dashboard. You can keep merging additional files anytime, or add
            PM inspections from each trap detail page.
          </p>
        </div>
      )}
    </Modal>
  );
}

function ModeCard({
  selected,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg border p-3 text-left transition-colors ${
        selected
          ? 'border-maroon-300 bg-maroon-50/60 ring-1 ring-maroon-200'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </button>
  );
}

function Stat({
  label,
  value,
  tone,
  isText,
}: {
  label: string;
  value: number | string;
  tone: 'good' | 'bad' | 'warn' | 'neutral';
  isText?: boolean;
}) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-700'
      : tone === 'bad'
        ? 'text-red-700'
        : tone === 'warn'
          ? 'text-amber-700'
          : 'text-slate-800';
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 ${isText ? 'text-sm font-semibold' : 'text-xl font-bold'} ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function IssueList({
  title,
  items,
  tone,
}: {
  title: string;
  items: ImportParseError[];
  tone: 'bad' | 'warn';
}) {
  if (items.length === 0) return null;
  const box =
    tone === 'bad'
      ? 'border-red-200 bg-red-50 text-red-900'
      : 'border-amber-200 bg-amber-50 text-amber-900';
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${box}`}>
      <p className="font-semibold">{title}</p>
      <ul className="mt-1 max-h-28 list-disc space-y-0.5 overflow-y-auto pl-4">
        {items.slice(0, 20).map((e, i) => (
          <li key={`${e.rowNumber}-${i}`}>
            {e.rowNumber > 0 ? `Row ${e.rowNumber}: ` : ''}
            {e.message}
          </li>
        ))}
        {items.length > 20 && <li>…and {items.length - 20} more</li>}
      </ul>
    </div>
  );
}
