import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Exercise, WorkoutExercise, WorkoutSet } from '../../types';
import AnchoredPopover from '../AnchoredPopover';
import DecimalInput from '../DecimalInput';
import DurationInput from '../DurationInput';
import SetKindMenu from '../SetKindMenu';
import SwipeRow from '../SwipeRow';
import RpeCell from './RpeCell';
import { SET_ROW_COLUMNS, type SetActions } from './types';
import { isCardio, paceMinKm, speedKmh } from '../../utils/holdSets';
import { SET_KINDS, kindOf, setLabel } from '../../utils/setTypes';
import { stepOnStack } from '../../utils/weightStack';

interface SetRowProps {
  exercise: Exercise;
  we: WorkoutExercise;
  set: WorkoutSet;
  setIndex: number;
  /** Pila de pesas de la máquina, si la tiene. */
  stack?: number[];
  actions: SetActions;
}

// text-base (16 px): por debajo de 16 px iOS hace zoom automático al enfocar un
// campo y descoloca la pantalla.
const inputClass = (completed: boolean) =>
  `w-full text-center px-1.5 py-2 border rounded-lg text-base font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
    completed ? 'bg-slate-950 border-emerald-900 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-200'
  }`;

export default function SetRow({ exercise, we, set, setIndex, stack, actions }: SetRowProps) {
  const [kindAnchor, setKindAnchor] = useState<HTMLElement | null>(null);
  const cardio = isCardio(exercise);
  const speed = cardio ? speedKmh(set.distance, set.reps) : null;
  const canRemove = we.sets.length > 1;

  return (
    <SwipeRow
      onSwipeLeft={canRemove ? () => actions.onRemove(we.id, set.id) : undefined}
      onSwipeRight={() => actions.onDuplicate(we.id, set.id)}
      leftLabel="Borrar"
      rightLabel="Copiar"
      className={`relative grid gap-1.5 items-center text-center py-1.5 rounded-xl transition-all ${
        set.completed ? 'bg-emerald-950/20 border-t border-b border-emerald-900/40' : 'hover:bg-slate-850/50'
      }`}
      style={{ gridTemplateColumns: SET_ROW_COLUMNS }}
    >
      {/* Número o tipo de serie (tocar para cambiarlo) */}
      <button
        type="button"
        onClick={(e) => setKindAnchor(kindAnchor ? null : e.currentTarget)}
        title="Tipo de serie"
        className="text-sm font-bold text-left pl-1 cursor-pointer whitespace-nowrap"
        style={{ color: SET_KINDS.find((k) => k.kind === kindOf(set))?.color }}
      >
        {setLabel(we.sets, setIndex)}
      </button>
      {kindAnchor && (
        <AnchoredPopover anchor={kindAnchor} width={256} onClose={() => setKindAnchor(null)}>
          <SetKindMenu
            current={kindOf(set)}
            onSelect={(kind) => {
              setKindAnchor(null);
              actions.onKind(we.id, set.id, kind);
            }}
          />
        </AnchoredPopover>
      )}

      {/* Peso (o kilómetros en cardio) */}
      <div className="min-w-0">
        <DecimalInput
          value={cardio ? set.distance ?? 0 : set.weight}
          placeholder="0"
          onChange={(v) => actions.onField(we.id, set.id, cardio ? 'distance' : 'weight', v)}
          className={inputClass(set.completed)}
        />
        {speed !== null && (
          <div className="mt-0.5 text-[10px] leading-tight text-slate-500 whitespace-nowrap">
            {speed} km/h · {paceMinKm(set.distance, set.reps)}/km
          </div>
        )}
        {/* Máquina con pila de pesas: un toque = un escalón real de la máquina */}
        {stack && !set.completed && !cardio && (
          <div className="mt-1 grid grid-cols-2 gap-1">
            {([-1, 1] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                aria-label={dir === 1 ? 'Subir un peso de la pila' : 'Bajar un peso de la pila'}
                onClick={() => actions.onField(we.id, set.id, 'weight', stepOnStack(set.weight, stack, dir))}
                className="h-6 rounded-md bg-slate-950 border border-amber-500/30 text-amber-300 text-xs font-black hover:bg-amber-950/40 cursor-pointer"
              >
                {dir === 1 ? '+' : '−'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Repeticiones (o tiempo en cardio) */}
      <div className="min-w-0">
        {cardio ? (
          <DurationInput value={set.reps} onChange={(sec) => actions.onField(we.id, set.id, 'reps', sec)} className={inputClass(set.completed)} />
        ) : (
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={set.reps || ''}
            placeholder="10"
            onChange={(e) => actions.onField(we.id, set.id, 'reps', parseInt(e.target.value) || 0)}
            className={inputClass(set.completed)}
          />
        )}
      </div>

      <RpeCell rpe={set.rpe} onChange={(rpe) => actions.onRpe(we.id, set.id, rpe)} />

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => actions.onToggleComplete(we.id, set.id)}
          aria-label={set.completed ? 'Desmarcar serie' : 'Marcar serie como hecha'}
          className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            set.completed
              ? 'bg-emerald-600 border border-emerald-500 text-white'
              : 'border border-slate-700 hover:border-slate-500 text-transparent bg-slate-950'
          }`}
        >
          <Check className="h-4.5 w-4.5 stroke-[4px]" />
        </button>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          disabled={!canRemove}
          onClick={() => actions.onRemove(we.id, set.id)}
          aria-label="Quitar serie"
          className="text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-slate-500 p-1.5 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </SwipeRow>
  );
}
