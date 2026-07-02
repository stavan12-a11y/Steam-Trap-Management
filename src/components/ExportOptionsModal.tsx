import { useEffect, useState } from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';
import type { AppData } from '../types';
import {
  EXPORT_OPTIONS,
  exportSelectedWorkbookCSV,
  exportSelectedWorkbookExcel,
  type ExportOptionKey,
} from '../utils/export';
import { sortedKPISnapshots } from '../utils/kpiSnapshots';
import { Modal } from './Modal';

interface ExportOptionsModalProps {
  open: boolean;
  onClose: () => void;
  data: AppData;
}

const DEFAULT_SELECTED: ExportOptionKey[] = [
  'current_kpis',
  'fleet_reliability_history',
  'active_issues_history',
  'trap_register',
  'inspection_history',
];

export function ExportOptionsModal({ open, onClose, data }: ExportOptionsModalProps) {
  const [selected, setSelected] = useState<Set<ExportOptionKey>>(new Set(DEFAULT_SELECTED));
  const snapshotCount = sortedKPISnapshots(data).length;

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(DEFAULT_SELECTED));
  }, [open]);

  const toggle = (key: ExportOptionKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectHistorical = () => {
    setSelected(new Set(EXPORT_OPTIONS.map((o) => o.key)));
  };

  const handleExport = (format: 'csv' | 'excel') => {
    const options = EXPORT_OPTIONS.filter((o) => selected.has(o.key)).map((o) => o.key);
    if (options.length === 0) return;
    if (format === 'csv') exportSelectedWorkbookCSV(data, options);
    else exportSelectedWorkbookExcel(data, options);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export data"
      description="Choose what to include. KPI history sheets use stored daily snapshots for trend analysis."
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={selected.size === 0}
            onClick={() => handleExport('csv')}
          >
            <Download className="h-4 w-4" />
            Download CSV
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={selected.size === 0}
            onClick={() => handleExport('excel')}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Download Excel
          </button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <span>
          <span className="font-semibold text-slate-800">{snapshotCount}</span> KPI snapshots stored
          for historical trends
        </span>
        <button type="button" className="text-xs font-semibold text-maroon-800 hover:underline" onClick={selectHistorical}>
          Select all
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {EXPORT_OPTIONS.map((option) => (
          <label
            key={option.key}
            className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
              selected.has(option.key)
                ? 'border-maroon-300 bg-maroon-50/50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.has(option.key)}
              onChange={() => toggle(option.key)}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {option.label}
                {option.historical && (
                  <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                    Trend
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{option.description}</p>
            </div>
          </label>
        ))}
      </div>
    </Modal>
  );
}
