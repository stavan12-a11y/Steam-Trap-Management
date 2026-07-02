import { FileSpreadsheet } from 'lucide-react';

interface ExportExcelButtonProps {
  onExcel: () => void;
  label?: string;
  className?: string;
}

export function ExportExcelButton({
  onExcel,
  label = 'Download Excel',
  className = 'mt-4',
}: ExportExcelButtonProps) {
  return (
    <button type="button" className={`btn-primary text-sm ${className}`} onClick={onExcel}>
      <FileSpreadsheet className="h-4 w-4" />
      {label}
    </button>
  );
}
