import React from 'react';
import { ChevronDown, ChevronRight, Dumbbell } from 'lucide-react';
import type { Exercise, WorkoutExercise } from '../../types';
import { useLightbox } from '../../context/LightboxContext';
import ExerciseMenu from './ExerciseMenu';
import SetsTable from './SetsTable';
import type { ExerciseActions, WorkoutView } from './types';
import { formatReps, isCardio, isHold } from '../../utils/holdSets';
import { getStaticThumbUrl } from '../../utils/media';

const hasValidPhoto = (ex: Exercise) =>
  !!ex.imageUrl && !ex.imageUrl.includes('placeholder') && (ex.imageUrl.startsWith('http') || ex.imageUrl.startsWith('/'));

/** «2/4 series · próxima: 80 kg × 8» — lo que se ve de un ejercicio cuando está plegado en la vista de lista. */
export function exerciseSummary(we: WorkoutExercise, ex: Exercise): string {
  const done = we.sets.filter((s) => s.completed).length;
  const next = we.sets.find((s) => !s.completed);
  const progress = `${done}/${we.sets.length} series`;
  if (!next) return `${progress} · completado`;
  if (isCardio(ex)) return progress;
  const reps = formatReps(next.reps, ex, !!we.perSide);
  const load = next.weight > 0 && !isHold(ex) ? `${next.weight} kg × ${reps}` : reps;
  return `${progress} · próxima: ${load}`;
}

interface ExerciseCardProps {
  index: number;
  we: WorkoutExercise;
  exercise: Exercise;
  alternatives: Exercise[];
  hasNext: boolean;
  linkedWithNext: boolean;
  /** Letra de la superserie a la que pertenece («A», «B»...), si pertenece a una. */
  groupLetter?: string;
  groupLabel?: string;
  view: WorkoutView;
  /** En la vista de lista, si el ejercicio está desplegado. */
  open: boolean;
  onToggleOpen: () => void;
  stack?: number[];
  actions: ExerciseActions;
}

/** Un ejercicio de la sesión: tarjeta completa o fila plegable según la vista elegida. */
export default function ExerciseCard({
  index,
  we,
  exercise,
  alternatives,
  hasNext,
  linkedWithNext,
  groupLetter,
  groupLabel,
  view,
  open,
  onToggleOpen,
  stack,
  actions,
}: ExerciseCardProps) {
  const { openLightbox } = useLightbox();
  const isList = view === 'list';
  const done = we.sets.length > 0 && we.sets.every((s) => s.completed);

  const menu = (
    <ExerciseMenu
      index={index}
      we={we}
      exercise={exercise}
      alternatives={alternatives}
      linkedWithNext={linkedWithNext}
      hasNext={hasNext}
      actions={actions}
    />
  );

  return (
    <div
      id={`workout-exercise-card-${we.id}`}
      className={`bg-slate-900 rounded-2xl border shadow-xl overflow-hidden ${
        groupLetter ? 'border-violet-500/50 border-l-4 border-l-violet-500' : done ? 'border-emerald-900/60' : 'border-slate-800'
      }`}
    >
      {groupLetter && (
        <div className="px-3 py-1 bg-violet-950/40 border-b border-violet-500/30 text-[10px] font-black uppercase tracking-wider text-violet-300">
          {groupLabel} {groupLetter} · sin descanso entre ejercicios del grupo
        </div>
      )}

      {isList ? (
        <div className="flex items-center gap-2 p-2.5 bg-slate-950">
          <button type="button" onClick={onToggleOpen} aria-expanded={open} className="flex flex-1 min-w-0 items-center gap-2.5 text-left cursor-pointer">
            {open ? <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />}
            <span
              className={`flex items-center justify-center h-7 w-7 rounded-full text-sm font-bold border shrink-0 ${
                done ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-850 border-slate-800 text-slate-300'
              }`}
            >
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="block font-extrabold text-white text-sm leading-tight truncate">{exercise.name}</span>
              <span className="block text-[11px] font-semibold text-slate-400 truncate">{exerciseSummary(we, exercise)}</span>
            </span>
          </button>
          {menu}
        </div>
      ) : (
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-3">
          <div className="w-14 sm:w-16 shrink-0 aspect-square rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
            {hasValidPhoto(exercise) ? (
              <img
                src={getStaticThumbUrl(exercise.imageUrl)}
                alt={exercise.name}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onClick={() => openLightbox(exercise.imageUrl, exercise.name, exercise.videoUrl)}
                className="w-full h-full object-contain cursor-zoom-in"
              />
            ) : (
              <Dumbbell className="h-5 w-5 text-blue-400" />
            )}
          </div>
          <span className="flex items-center justify-center h-7 w-7 rounded-full bg-slate-850 text-slate-300 text-sm font-bold border border-slate-800 shrink-0">
            {index + 1}
          </span>
          <div className="text-left min-w-0 flex-1">
            <h4 className="font-extrabold text-white text-base leading-tight break-words">{exercise.name}</h4>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider break-words">
              {exercise.muscleGroup} • {exercise.equipment}
            </span>
          </div>
          {menu}
        </div>
      )}

      {(!isList || open) && <SetsTable exercise={exercise} we={we} stack={stack} actions={actions} />}
    </div>
  );
}
