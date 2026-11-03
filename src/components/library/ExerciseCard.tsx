import { Info, Clock, ChevronRight, Sparkles, Star, History } from 'lucide-react';
import { Exercise} from '../../types';
import { getMuscleColor } from '../../data/exerciseMeta';
import ExerciseCardThumbnail from '../ExerciseCardThumbnail';
import type { } from '../../api/client';
import { useUserData } from '../../context/UserDataContext';
import { toggleFavorite} from '../../utils/equipment';

interface ExerciseCardProps {
  ex: Exercise;
  libraryViewMode: 'photo' | 'anatomy';
  isFavorite: boolean;
  favorites: string[];
  selectable: boolean;
  onSelectExercise?: (exercise: Exercise) => void;
  /** Si hay historial de entrenamientos disponible, se muestra el botón «Historial». */
  hasHistory: boolean;
  onViewDetails: (exercise: Exercise) => void;
  onOpenHistory: (exercise: Exercise) => void;
}

/** Tarjeta de un ejercicio en la biblioteca: imagen, datos y acciones. */
export default function ExerciseCard({
  ex, libraryViewMode, isFavorite, favorites, selectable, onSelectExercise, hasHistory, onViewDetails, onOpenHistory,
}: ExerciseCardProps) {
  const { setValue } = useUserData();
  return (
  <div
    id={`exercise-card-${ex.id}`}
    className="group bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden hover:shadow-xl hover:border-slate-700 transition-all duration-300 flex flex-row"
  >
    {/* Visual: imagen a la izquierda, completa (sin recortar) */}
    <div className="w-1/4 sm:w-40 lg:w-44 shrink-0 relative bg-slate-950 overflow-hidden border-r border-slate-900">
      <ExerciseCardThumbnail exercise={ex} mode={libraryViewMode} />
    </div>

    {/* Info Body */}
    <div className="p-4 flex flex-col justify-between flex-grow min-w-0 bg-slate-900">
      <div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span
            className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider"
            style={{ backgroundColor: getMuscleColor(ex.muscleGroup) }}
          >
            {ex.muscleGroup}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-200 uppercase tracking-wider bg-slate-950/90 backdrop-blur-sm border border-slate-800/85">
            {ex.equipment}
          </span>
          {ex.category && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-blue-200 uppercase tracking-wider bg-blue-950/60 border border-blue-500/20">
              {ex.category}
            </span>
          )}
          {ex.isCustom && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider bg-blue-600/90 backdrop-blur-sm flex items-center gap-0.5 shadow-md">
              <Sparkles className="h-2.5 w-2.5" /> Personalizado
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold text-slate-100 line-clamp-2 group-hover:text-blue-400 transition-colors text-sm sm:text-base">
            {ex.name}
          </h3>
          <button
            type="button"
            onClick={() => setValue('favorites', toggleFavorite(favorites, ex.id))}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Quitar ${ex.name} de favoritos` : `Añadir ${ex.name} a favoritos`}
            className={`shrink-0 p-1 -mt-0.5 -mr-1 rounded-lg cursor-pointer ${isFavorite ? 'text-amber-400' : 'text-slate-600 hover:text-amber-300'}`}
          >
            <Star className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1">
          <Clock className="h-3.5 w-3.5 text-blue-400" />
          <span>Descanso sugerido: {ex.defaultRestTime}s</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-slate-800">
        <button
          onClick={() => onViewDetails(ex)}
          className="flex-1 min-w-[112px] flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-800 whitespace-nowrap"
        >
          <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          Instrucciones
        </button>
        {hasHistory && (
          <button
            onClick={() => onOpenHistory(ex)}
            className="flex-1 min-w-[112px] flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-800 whitespace-nowrap"
          >
            <History className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            Historial
          </button>
        )}
        {selectable && onSelectExercise && (
          <button
            onClick={() => onSelectExercise(ex)}
            className="flex-1 min-w-[112px] px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-blue-500/10 whitespace-nowrap"
          >
            Seleccionar
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          </button>
        )}
      </div>
    </div>
  </div>
  );
}
