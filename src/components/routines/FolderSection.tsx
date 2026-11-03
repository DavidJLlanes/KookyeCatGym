import { Trash2, ChevronUp, ChevronDown, Folder, FolderOpen} from 'lucide-react';
import { Routine, Exercise} from '../../types';
import RoutineCard from './RoutineCard';

export const NO_FOLDER = '__sin_carpeta__';

// Paleta de acentos que se reparte entre carpetas (por índice) para darle a
// cada una identidad visual propia. Las clases están escritas en literal
// completo para que Tailwind las detecte al escanear el código fuente.
const FOLDER_ACCENTS = [
  { icon: 'text-blue-400', badgeBg: 'bg-blue-500/15', badgeBorder: 'border-blue-500/30', hoverBorder: 'hover:border-blue-500/40', hoverText: 'group-hover:text-blue-300' },
  { icon: 'text-emerald-400', badgeBg: 'bg-emerald-500/15', badgeBorder: 'border-emerald-500/30', hoverBorder: 'hover:border-emerald-500/40', hoverText: 'group-hover:text-emerald-300' },
  { icon: 'text-amber-400', badgeBg: 'bg-amber-500/15', badgeBorder: 'border-amber-500/30', hoverBorder: 'hover:border-amber-500/40', hoverText: 'group-hover:text-amber-300' },
  { icon: 'text-fuchsia-400', badgeBg: 'bg-fuchsia-500/15', badgeBorder: 'border-fuchsia-500/30', hoverBorder: 'hover:border-fuchsia-500/40', hoverText: 'group-hover:text-fuchsia-300' },
  { icon: 'text-cyan-400', badgeBg: 'bg-cyan-500/15', badgeBorder: 'border-cyan-500/30', hoverBorder: 'hover:border-cyan-500/40', hoverText: 'group-hover:text-cyan-300' },
  { icon: 'text-orange-400', badgeBg: 'bg-orange-500/15', badgeBorder: 'border-orange-500/30', hoverBorder: 'hover:border-orange-500/40', hoverText: 'group-hover:text-orange-300' },
];
const NEUTRAL_ACCENT = { icon: 'text-slate-400', badgeBg: 'bg-slate-800/60', badgeBorder: 'border-slate-700', hoverBorder: 'hover:border-slate-700', hoverText: 'group-hover:text-slate-200' };

interface FolderSectionProps {
  label: string;
  routines: Routine[];
  exercises: Exercise[];
  isCollapsed: boolean;
  onToggle: () => void;
  onStart: (routine: Routine) => void;
  onEdit: (routine: Routine) => void;
  onDelete: (routineId: string) => void;
  onMoveRoutineUp: (routineId: string) => void;
  onMoveRoutineDown: (routineId: string) => void;
  accentIndex?: number;
  onMoveFolderUp?: () => void;
  onMoveFolderDown?: () => void;
  canMoveFolderUp?: boolean;
  canMoveFolderDown?: boolean;
  onDeleteFolder?: () => void;
}

export default function FolderSection({
  label,
  routines,
  exercises,
  isCollapsed,
  onToggle,
  onStart,
  onEdit,
  onDelete,
  onMoveRoutineUp,
  onMoveRoutineDown,
  accentIndex,
  onMoveFolderUp,
  onMoveFolderDown,
  canMoveFolderUp,
  canMoveFolderDown,
  onDeleteFolder,
}: FolderSectionProps) {
  // Nota: una carpeta vacía SÍ se muestra (para poder crearla antes de meterle
  // rutinas y para poder borrarla). El grupo "sin carpeta" ya se oculta desde
  // fuera cuando no tiene rutinas.
  const accent = accentIndex === undefined ? NEUTRAL_ACCENT : FOLDER_ACCENTS[accentIndex % FOLDER_ACCENTS.length];
  const folderReorderable = !!(onMoveFolderUp || onMoveFolderDown);

  return (
    <div className="space-y-4">
      <div
        className={`w-full flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 ${accent.hoverBorder} rounded-2xl px-2 py-2 sm:px-2.5 sm:py-2.5 shadow-sm transition-all`}
      >
        {folderReorderable && (
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              type="button"
              onClick={onMoveFolderUp}
              disabled={!canMoveFolderUp}
              title="Mover carpeta arriba"
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-slate-700 disabled:opacity-25 disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveFolderDown}
              disabled={!canMoveFolderDown}
              title="Mover carpeta abajo"
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-slate-700 disabled:opacity-25 disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 min-w-[9.5rem] flex items-center gap-3 text-left cursor-pointer group px-1.5 py-1 sm:px-2"
        >
          <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl ${accent.badgeBg} border ${accent.badgeBorder} flex items-center justify-center shrink-0 transition-colors`}>
            {isCollapsed ? (
              <Folder className={`h-5 w-5 ${accent.icon}`} />
            ) : (
              <FolderOpen className={`h-5 w-5 ${accent.icon}`} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`font-extrabold text-white text-sm sm:text-base leading-tight line-clamp-2 break-words transition-colors ${accent.hoverText}`}>
              {label}
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">
              {routines.length} {routines.length === 1 ? 'rutina' : 'rutinas'}
            </span>
          </div>
          <ChevronDown
            className={`h-4.5 w-4.5 text-slate-500 transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : ''}`}
          />
        </button>
        {onDeleteFolder && (
          <button
            type="button"
            onClick={onDeleteFolder}
            title="Eliminar carpeta"
            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all cursor-pointer shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routines.map((routine, idx) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              exercises={exercises}
              onStart={onStart}
              onEdit={onEdit}
              onDelete={onDelete}
              onMoveUp={() => onMoveRoutineUp(routine.id)}
              onMoveDown={() => onMoveRoutineDown(routine.id)}
              canMoveUp={idx > 0}
              canMoveDown={idx < routines.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
