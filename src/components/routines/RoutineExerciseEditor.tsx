import React, { useState } from 'react';
import { Plus, Clock, X, ChevronUp, ChevronDown, Link2, Link2Off } from 'lucide-react';
import ExerciseThumb from './ExerciseThumb';
import { Exercise, WorkoutExercise} from '../../types';
import DecimalInput from '../DecimalInput';
import { repsColumnLabel, isCardio, isHold} from '../../utils/holdSets';
import DurationInput from '../DurationInput';
import { SET_KINDS, SetKind, kindOf, setLabel, groupName } from '../../utils/setTypes';
import AnchoredPopover from '../AnchoredPopover';
import SetKindMenu from '../SetKindMenu';
import ExerciseQuickPick from '../ExerciseQuickPick';
import WeightStackEditor from '../WeightStackEditor';
import { MAX_ALTERNATIVES } from '../../utils/exerciseSwap';
import { formatRest } from '../../utils/restTimes';
import { PyramidDirection } from '../../utils/pyramid';

interface RoutineExerciseEditorProps {
  we: WorkoutExercise;
  index: number;
  /** Todos los ejercicios de la rutina (para agrupar superseries y enlazar con el siguiente). */
  items: WorkoutExercise[];
  exercises: Exercise[];
  supersetLetter?: string;
  onOpenRestPicker: (picker: { instanceId: string; setId?: string }) => void;
  handlers: {
    handleAddSet: (instanceId: string) => void;
    handleMoveExercise: (index: number, direction: 'up' | 'down') => void;
    handlePyramid: (instanceId: string, direction: PyramidDirection, defaultRest: number) => void;
    handleRemoveExercise: (instanceId: string) => void;
    handleRemoveSet: (instanceId: string, setId: string) => void;
    handleSetAlternatives: (instanceId: string, ids: string[]) => void;
    handleSetKind: (instanceId: string, setId: string, kind: SetKind) => void;
    handleTogglePerSide: (instanceId: string) => void;
    handleToggleSuperset: (index: number) => void;
    handleUpdateSetValues: (instanceId: string, setId: string, field: 'weight' | 'reps' | 'distance', val: number) => void;
  };
}

/** Un ejercicio dentro del editor de rutina: cabecera, descanso, alternativas y tabla de series. */
export default function RoutineExerciseEditor({
  we, index, items, exercises, supersetLetter, onOpenRestPicker, handlers,
}: RoutineExerciseEditorProps) {
  const {
    handleAddSet, handleMoveExercise, handlePyramid, handleRemoveExercise, handleRemoveSet,
    handleSetAlternatives, handleSetKind, handleTogglePerSide, handleToggleSuperset, handleUpdateSetValues,
  } = handlers;
  // Menú de tipo de serie abierto: serie y botón junto al que se muestra
  const [kindPicker, setKindPicker] = useState<{ setId: string; anchor: HTMLElement } | null>(null);
  const ex = exercises.find((e) => e.id === we.exerciseId);
  if (!ex) return null;
  const hasNext = index < items.length - 1;
  const linkedWithNext = !!we.supersetId && we.supersetId === items[index + 1]?.supersetId;

  return (
      <div
        key={we.id}
        className={`bg-slate-900 border rounded-2xl shadow-lg overflow-hidden ${
          supersetLetter ? 'border-violet-500/50 border-l-4 border-l-violet-500' : 'border-slate-800'
        }`}
      >
        {supersetLetter && (
          <div className="px-3 py-1 bg-violet-950/40 border-b border-violet-500/30 text-[10px] font-black uppercase tracking-wider text-violet-300">
            {groupName(items, index)} {supersetLetter} · sin descanso entre ejercicios del grupo
          </div>
        )}
        {/* Title Row */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-3">
          {/* Reordenar ejercicio */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => handleMoveExercise(index, 'up')}
              disabled={index === 0}
              title="Subir"
              className="p-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-slate-700 disabled:opacity-25 disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleMoveExercise(index, 'down')}
              disabled={index === items.length - 1}
              title="Bajar"
              className="p-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-slate-700 disabled:opacity-25 disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <ExerciseThumb ex={ex} />
          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-850 text-slate-300 text-xs font-bold border border-slate-800 shrink-0">
                {index + 1}
              </span>
              <div className="font-bold text-white text-sm truncate">{ex.name}</div>
            </div>
            {hasNext && (
              <button
                type="button"
                onClick={() => handleToggleSuperset(index)}
                title={linkedWithNext ? 'Separar del siguiente ejercicio' : 'Hacer superserie con el siguiente ejercicio'}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer shrink-0 ${
                  linkedWithNext
                    ? 'bg-violet-950/40 border-violet-500/40 text-violet-300 hover:bg-violet-900/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {linkedWithNext ? <Link2Off className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                <span className="hidden sm:inline">{linkedWithNext ? 'Separar' : 'Superserie'}</span>
              </button>
            )}
            <button
              onClick={() => handleRemoveExercise(we.id)}
              className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-850 transition-all cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Set Grid */}
        <div className="p-4 space-y-3 bg-slate-900">
          {/* Rest Timer Config */}
          <div className="flex items-center gap-2 text-xs text-slate-400 pb-2 border-b border-dashed border-slate-800">
            <Clock className="h-3.5 w-3.5 text-blue-400" />
            <span>Descanso predeterminado:</span>
            <button
              type="button"
              onClick={() => onOpenRestPicker({ instanceId: we.id })}
              className="px-2 py-0.5 bg-slate-950 border border-slate-800 hover:border-blue-500/50 rounded text-center font-bold text-blue-400 cursor-pointer"
            >
              {formatRest(we.restTime ?? ex.defaultRestTime)}
            </button>
          </div>

          <WeightStackEditor exerciseId={we.exerciseId} />

          {/* Ejercicios de repuesto: si la máquina está ocupada, se cambia por uno de estos con un toque */}
          <div className="space-y-2 pb-2 border-b border-dashed border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
              <span>Si está ocupado, cambiar por:</span>
              {(we.alternativeIds ?? []).length === 0 && <span className="text-slate-600">nada (opcional)</span>}
              {(we.alternativeIds ?? []).map((altId) => (
                <span key={altId} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg bg-violet-950/40 border border-violet-500/30 text-violet-300 font-bold">
                  {exercises.find((e) => e.id === altId)?.name ?? altId}
                  <button
                    type="button"
                    aria-label="Quitar alternativa"
                    onClick={() => handleSetAlternatives(we.id, (we.alternativeIds ?? []).filter((x) => x !== altId))}
                    className="p-0.5 text-violet-300/70 hover:text-rose-300 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {(we.alternativeIds ?? []).length < MAX_ALTERNATIVES && (
              <ExerciseQuickPick
                exercises={exercises}
                exclude={[we.exerciseId, ...(we.alternativeIds ?? [])]}
                preferGroup={ex.muscleGroup}
                placeholder="Añadir un ejercicio de repuesto…"
                onPick={(alt) => handleSetAlternatives(we.id, [...(we.alternativeIds ?? []), alt.id])}
              />
            )}
          </div>

          {/* Sets Header */}
          <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
            <span className="col-span-2 text-left">Serie</span>
            <span className="col-span-3">{isCardio(ex) ? 'Km' : 'Peso (kg)'}</span>
            <span className="col-span-3">{repsColumnLabel(ex, true, !!we.perSide)}</span>
            <span className="col-span-3">Descanso</span>
            <span className="col-span-1" />
          </div>

          {/* Sets Rows */}
          {we.sets.map((set, setIndex) => (
            <div key={set.id} className="grid grid-cols-12 gap-2 items-center text-center">
              <button
                type="button"
                onClick={(e) =>
                  setKindPicker(kindPicker?.setId === set.id ? null : { setId: set.id, anchor: e.currentTarget })
                }
                title="Tipo de serie"
                className="col-span-2 text-xs font-bold text-left cursor-pointer whitespace-nowrap"
                style={{ color: SET_KINDS.find((k) => k.kind === kindOf(set))?.color }}
              >
                {setLabel(we.sets, setIndex)}
              </button>
              {kindPicker?.setId === set.id && (
                <AnchoredPopover anchor={kindPicker.anchor} width={256} onClose={() => setKindPicker(null)}>
                  <SetKindMenu current={kindOf(set)} onSelect={(k) => {
                      setKindPicker(null);
                      handleSetKind(we.id, set.id, k);
                    }} />
                </AnchoredPopover>
              )}
              
              <div className="col-span-3">
                <DecimalInput
                  value={isCardio(ex) ? set.distance ?? 0 : set.weight}
                  placeholder="0"
                  onChange={(v) => handleUpdateSetValues(we.id, set.id, isCardio(ex) ? 'distance' : 'weight', v)}
                  className="w-full text-center px-2 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-100"
                />
              </div>

              <div className="col-span-3">
                {isCardio(ex) ? (
                  <DurationInput
                    value={set.reps}
                    onChange={(sec) => handleUpdateSetValues(we.id, set.id, 'reps', sec)}
                    className="w-full text-center px-2 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-100"
                  />
                ) : (
                <input
                  type="number"
                  min={1}
                  value={set.reps || ''}
                  placeholder="10"
                  onChange={(e) => handleUpdateSetValues(we.id, set.id, 'reps', parseInt(e.target.value) || 0)}
                  className="w-full text-center px-2 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-100"
                />
                )}
              </div>

              <button
                type="button"
                onClick={() => onOpenRestPicker({ instanceId: we.id, setId: set.id })}
                title="Descanso de esta serie"
                className={`col-span-3 px-1 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer truncate ${
                  set.restTime !== undefined
                    ? 'bg-blue-950/40 border-blue-500/40 text-blue-300'
                    : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300'
                }`}
              >
                {set.restTime !== undefined ? formatRest(set.restTime) : 'Igual'}
              </button>

              <div className="col-span-1 flex justify-center">
                <button
                  type="button"
                  disabled={we.sets.length <= 1}
                  onClick={() => handleRemoveSet(we.id, set.id)}
                  className="text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-slate-500 p-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Add Set Button */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5">
            <button
              type="button"
              onClick={() => handleAddSet(we.id)}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3 w-3" /> Añadir Serie
            </button>
            {!isHold(ex) && (
              <button
                type="button"
                onClick={() => handleTogglePerSide(we.id)}
                aria-pressed={!!we.perSide}
                title="Contar las repeticiones por lado (zancadas, trabajo a una mano...)"
                className={`text-xs font-bold cursor-pointer ${we.perSide ? 'text-teal-300' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {we.perSide ? '✓ Por lado' : 'Por lado'}
              </button>
            )}
            <span className="text-[11px] text-slate-500 flex items-center gap-2">
              Pirámide:
              <button type="button" onClick={() => handlePyramid(we.id, 'up', ex.defaultRestTime)} title="Cada serie con más peso y menos repeticiones" className="font-bold text-violet-300 hover:text-violet-200 cursor-pointer">▲ ascendente</button>
              <button type="button" onClick={() => handlePyramid(we.id, 'down', ex.defaultRestTime)} title="Empieza pesado y baja el peso subiendo repeticiones" className="font-bold text-violet-300 hover:text-violet-200 cursor-pointer">▼ descendente</button>
            </span>
          </div>
        </div>
      </div>

  );
}
