import { Download, FileSpreadsheet } from 'lucide-react';

interface ExportButtonsProps {
  onCSV: () => void;
  onExcel: () => void;
  className?: string;
}

export function ExportButtons({ onCSV, onExcel, className = 'mt-4' }: ExportButtonsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button type="button" className="btn-secondary text-sm" onClick={onCSV}>
        <Download className="h-4 w-4" />
        CSV
      </button>
      <button type="button" className="btn-primary text-sm" onClick={onExcel}>
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </button>
    </div>
  );
}
