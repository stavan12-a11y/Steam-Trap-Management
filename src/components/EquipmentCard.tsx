import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Cog, Droplets, FlaskConical, MapPin, Pencil, Trash2 } from 'lucide-react';
import type { EquipmentRollup } from '../utils/logic';
import { useSteamTrap } from '../store/SteamTrapContext';

interface EquipmentCardProps {
  rollup: EquipmentRollup;
  onEdit: () => void;
}

export function EquipmentCard({ rollup, onEdit }: EquipmentCardProps) {
  const navigate = useNavigate();
  const { deleteEquipment } = useSteamTrap();

  return (
    <div
      onClick={() => navigate(`/equipment/${rollup.id}`)}
      className="card group flex cursor-pointer items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:border-maroon-200 hover:shadow-card-hover"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-maroon-50 text-maroon-800">
        <Cog className="h-6 w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-bold text-slate-900">{rollup.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {rollup.area || '—'}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Droplets className="h-3.5 w-3.5" />
            {rollup.trap_count} traps
          </span>
          {rollup.issue_count > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {rollup.issue_count}
            </span>
          )}
          {rollup.engineering_review_count > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-violet-600">
              <FlaskConical className="h-3.5 w-3.5" />
              {rollup.engineering_review_count} review
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
          title="Edit equipment"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (
              confirm(
                `Delete ${rollup.name} and all of its traps and PM history? This cannot be undone.`,
              )
            ) {
              deleteEquipment(rollup.id);
            }
          }}
          className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          title="Delete equipment"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <ChevronRight className="h-5 w-5 text-slate-300" />
      </div>
    </div>
  );
}
