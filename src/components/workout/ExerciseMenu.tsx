import React, { useState } from 'react';
import { ArrowLeftRight, Clock, History, Link2, Link2Off, MoreVertical, Repeat, Trash2 } from 'lucide-react';
import type { Exercise, WorkoutExercise } from '../../types';
import AnchoredPopover from '../AnchoredPopover';
import type { ExerciseActions } from './types';
import { isHold } from '../../utils/holdSets';

interface ExerciseMenuProps {
  index: number;
  we: WorkoutExercise;
  exercise: Exercise;
  /** Ejercicios de repuesto de este hueco, ya resueltos. */
  alternatives: Exercise[];
  linkedWithNext: boolean;
  hasNext: boolean;
  actions: ExerciseActions;
}

const itemClass =
  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-bold text-slate-200 hover:bg-slate-900 cursor-pointer';

/** Un solo menú «⋯» con todo lo que se puede hacer con un ejercicio de la sesión. */
export default function ExerciseMenu({ index, we, exercise, alternatives, linkedWithNext, hasNext, actions }: ExerciseMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  const run = (fn: () => void) => () => {
    close();
    fn();
  };
  const canSwap = alternatives.length > 0 && !we.sets.some((s) => s.completed);

  return (
    <>
      <button
        type="button"
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
        aria-label={`Opciones de ${exercise.name}`}
        aria-haspopup="menu"
        className="icon-btn !h-9 !w-9 border-transparent text-slate-400 hover:text-white shrink-0"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {anchor && (
        <AnchoredPopover anchor={anchor} align="right" width={272} onClose={close}>
          <div role="menu" className="text-left space-y-0.5">
            <div className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-slate-400">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              Descanso recomendado: <span className="font-bold text-blue-400">{exercise.defaultRestTime}s</span>
            </div>

            <button type="button" role="menuitem" className={itemClass} onClick={run(() => actions.onHistory(exercise))}>
              <History className="h-4 w-4 text-slate-400" />
              Historial del ejercicio
            </button>

            {!isHold(exercise) && (
              <button type="button" role="menuitem" className={itemClass} onClick={run(() => actions.onTogglePerSide(we.id))}>
                <ArrowLeftRight className={`h-4 w-4 ${we.perSide ? 'text-teal-400' : 'text-slate-400'}`} />
                Repeticiones por lado
                <span className={`ml-auto text-[10px] ${we.perSide ? 'text-teal-300' : 'text-slate-500'}`}>{we.perSide ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {hasNext && (
              <button type="button" role="menuitem" className={itemClass} onClick={run(() => actions.onToggleSuperset(index))}>
                {linkedWithNext ? <Link2Off className="h-4 w-4 text-violet-400" /> : <Link2 className="h-4 w-4 text-slate-400" />}
                {linkedWithNext ? 'Separar del siguiente' : 'Enlazar con el siguiente (superserie)'}
              </button>
            )}

            {canSwap && (
              <div className="pt-1 mt-1 border-t border-slate-800">
                <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-300">
                  <Repeat className="h-3 w-3" /> ¿Ocupado? Cambiar por
                </div>
                {alternatives.map((alt) => (
                  <button key={alt.id} type="button" role="menuitem" className={itemClass} onClick={run(() => actions.onSwap(we.id, alt.id))}>
                    <span className="truncate">{alt.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="pt-1 mt-1 border-t border-slate-800">
              <button
                type="button"
                role="menuitem"
                className={`${itemClass} !text-rose-300 hover:!bg-rose-950/40`}
                onClick={run(() => actions.onRemoveExercise(we.id))}
              >
                <Trash2 className="h-4 w-4" />
                Quitar del entrenamiento
              </button>
            </div>
          </div>
        </AnchoredPopover>
      )}
    </>
  );
}
