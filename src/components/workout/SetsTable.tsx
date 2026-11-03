import React from 'react';
import { Check, Plus, Timer } from 'lucide-react';
import type { Exercise, WorkoutExercise } from '../../types';
import SetRow from './SetRow';
import { SET_ROW_COLUMNS, type ExerciseActions } from './types';
import { formatDuration, isCardio, isHold, repsColumnLabel } from '../../utils/holdSets';

interface SetsTableProps {
  exercise: Exercise;
  we: WorkoutExercise;
  stack?: number[];
  actions: ExerciseActions;
}

/** Cabecera de columnas, filas de series y botones de añadir serie / cronometrar. */
export default function SetsTable({ exercise, we, stack, actions }: SetsTableProps) {
  // Plancha, colgados...: se pueden cronometrar (el cardio tiene su propio tiempo)
  const timed = isHold(exercise) && !isCardio(exercise);
  const nextTimedSet = timed ? we.sets.find((s) => !s.completed && s.reps > 0) : undefined;

  return (
    <div className="p-4 space-y-3 bg-slate-900">
      <div
        className="grid gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-b border-slate-800 pb-2"
        style={{ gridTemplateColumns: SET_ROW_COLUMNS }}
      >
        <span className="text-left whitespace-nowrap">Serie</span>
        <span className="whitespace-nowrap">{isCardio(exercise) ? 'Km' : 'Peso'}</span>
        <span className="whitespace-nowrap">{repsColumnLabel(exercise, false, !!we.perSide)}</span>
        <span className="whitespace-nowrap">RPE</span>
        <span className="flex justify-center">
          <Check className="h-4 w-4 stroke-[3px]" />
        </span>
        <span />
      </div>

      {we.sets.map((set, setIndex) => (
        <SetRow key={set.id} exercise={exercise} we={we} set={set} setIndex={setIndex} stack={stack} actions={actions} />
      ))}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1.5">
        <button
          type="button"
          onClick={() => actions.onAdd(we.id)}
          className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Plus className="h-3 w-3" /> Añadir Serie
        </button>
        {nextTimedSet && (
          <button
            type="button"
            onClick={() => actions.onStartHold(we, nextTimedSet, exercise.name)}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Timer className="h-3.5 w-3.5" /> Cronometrar serie ({formatDuration(nextTimedSet.reps)})
          </button>
        )}
      </div>
    </div>
  );
}
