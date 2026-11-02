import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2, Search, Check } from 'lucide-react';
import type { Exercise, WorkoutLog } from '../types';
import DecimalInput from './DecimalInput';
import { fromLocalInput, newSet, newWorkoutExercise, toLocalInput, validateLog } from '../utils/logEdit';
import { isHold, repsColumnLabel } from '../utils/holdSets';

interface WorkoutLogEditorProps {
  /** Entrenamiento a corregir, o uno en blanco para registrar uno hecho en papel. */
  log: WorkoutLog;
  isNew: boolean;
  exercises: Exercise[];
  onSave: (log: WorkoutLog) => void;
  onClose: () => void;
}

const field = 'w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg text-sm text-white outline-none';

export default function WorkoutLogEditor({ log, isNew, exercises, onSave, onClose }: WorkoutLogEditorProps) {
  const [draft, setDraft] = useState<WorkoutLog>(() => structuredClone(log));
  const [when, setWhen] = useState(() => toLocalInput(log.date));
  const [minutes, setMinutes] = useState(() => String(Math.round(log.duration / 60)));
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return exercises.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, exercises]);

  const patchExercise = (weId: string, fn: (we: WorkoutLog['exercises'][number]) => WorkoutLog['exercises'][number]) =>
    setDraft((d) => ({ ...d, exercises: d.exercises.map((we) => (we.id === weId ? fn(we) : we)) }));

  const save = () => {
    const iso = fromLocalInput(when);
    const mins = Number(minutes.replace(',', '.'));
    if (!iso) return setError('La fecha no es válida.');
    if (!Number.isFinite(mins)) return setError('La duración no es válida.');
    const next: WorkoutLog = { ...draft, routineName: draft.routineName.trim(), date: iso, duration: Math.round(mins * 60) };
    const problem = validateLog(next);
    if (problem) return setError(problem);
    onSave(next);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={isNew ? 'Registrar entrenamiento' : 'Editar entrenamiento'}>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full sm:max-w-2xl max-h-[92dvh] flex flex-col bg-slate-900 border border-slate-800 sm:rounded-3xl rounded-t-3xl shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
          <h3 className="font-black text-white">{isNew ? 'Registrar un entrenamiento pasado' : 'Editar entrenamiento'}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <label htmlFor="le-name" className="block text-[11px] font-bold text-slate-500 mb-1">Nombre</label>
              <input id="le-name" type="text" value={draft.routineName} onChange={(e) => setDraft({ ...draft, routineName: e.target.value })} placeholder="Ej. Pierna" className={field} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="le-when" className="block text-[11px] font-bold text-slate-500 mb-1">Fecha y hora</label>
              <input id="le-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="le-min" className="block text-[11px] font-bold text-slate-500 mb-1">Duración (min)</label>
              <input id="le-min" type="text" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[^0-9.,]/g, ''))} className={field} />
            </div>
          </div>

          {draft.exercises.map((we) => {
            const ex = byId.get(we.exerciseId);
            const timed = isHold(ex);
            return (
              <div key={we.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-slate-100 truncate">{ex?.name ?? 'Ejercicio desconocido'}</span>
                  <button type="button" aria-label={`Quitar ${ex?.name ?? 'ejercicio'}`} onClick={() => setDraft((d) => ({ ...d, exercises: d.exercises.filter((x) => x.id !== we.id) }))} className="p-1.5 text-slate-500 hover:text-red-400 cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-[1.5rem_1fr_1fr_3.5rem_2.25rem_2rem] gap-2 text-[10px] font-bold text-slate-500 uppercase px-0.5">
                  <span>#</span>
                  <span>kg</span>
                  <span>{repsColumnLabel(ex)}</span>
                  <span>RPE</span>
                  <span className="text-center">Hecha</span>
                  <span />
                </div>
                {we.sets.map((s, i) => (
                  <div key={s.id} className="grid grid-cols-[1.5rem_1fr_1fr_3.5rem_2.25rem_2rem] gap-2 items-center">
                    <span className={`text-xs font-bold ${s.isWarmup ? 'text-amber-400' : 'text-slate-400'}`}>{s.isWarmup ? 'C' : i + 1}</span>
                    <DecimalInput value={s.weight} onChange={(v) => patchExercise(we.id, (x) => ({ ...x, sets: x.sets.map((y) => (y.id === s.id ? { ...y, weight: v } : y)) }))} className={field} />
                    <DecimalInput value={s.reps} onChange={(v) => patchExercise(we.id, (x) => ({ ...x, sets: x.sets.map((y) => (y.id === s.id ? { ...y, reps: Math.round(v) } : y)) }))} className={field} />
                    <DecimalInput value={s.rpe ?? 0} onChange={(v) => patchExercise(we.id, (x) => ({ ...x, sets: x.sets.map((y) => (y.id === s.id ? { ...y, rpe: v > 0 ? Math.min(10, v) : undefined } : y)) }))} placeholder="—" className={field} />
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={s.completed}
                      aria-label={`Serie ${i + 1} hecha`}
                      onClick={() => patchExercise(we.id, (x) => ({ ...x, sets: x.sets.map((y) => (y.id === s.id ? { ...y, completed: !y.completed } : y)) }))}
                      className={`h-9 rounded-lg border flex items-center justify-center cursor-pointer ${s.completed ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-950 border-slate-700 text-transparent'}`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={`Quitar la serie ${i + 1}`} onClick={() => patchExercise(we.id, (x) => ({ ...x, sets: x.sets.filter((y) => y.id !== s.id) }))} className="p-1 text-slate-500 hover:text-red-400 cursor-pointer">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => patchExercise(we.id, (x) => ({ ...x, sets: [...x.sets, newSet(ex, x.sets[x.sets.length - 1])] }))} className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> Añadir {timed ? 'tiempo' : 'serie'}
                </button>
              </div>
            );
          })}

          <div className="space-y-2">
            <label htmlFor="le-add" className="block text-[11px] font-bold text-slate-500">Añadir ejercicio</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input id="le-add" type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Busca por nombre (mín. 2 letras)" className={`${field} pl-9`} />
            </div>
            {matches.length > 0 && (
              <ul className="rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-800 overflow-hidden">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft((d) => ({ ...d, exercises: [...d.exercises, newWorkoutExercise(m)] }));
                        setQuery('');
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 cursor-pointer"
                    >
                      {m.name} <span className="text-xs text-slate-500">· {m.muscleGroup}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <div role="alert" className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-300">{error}</div>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-800">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold cursor-pointer border border-slate-700">Cancelar</button>
          <button type="button" onClick={save} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold cursor-pointer">{isNew ? 'Guardar entrenamiento' : 'Guardar cambios'}</button>
        </div>
      </motion.div>
    </div>
  );
}
