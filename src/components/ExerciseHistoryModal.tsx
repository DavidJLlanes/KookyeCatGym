import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Trophy, History } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { Exercise, WorkoutLog } from '../types';
import { getExerciseHistory } from '../utils/exerciseHistory';
import { formatDuration, isCardio, isHold, paceMinKm, speedKmh } from '../utils/holdSets';
import { formatEsNumber } from '../utils/number';

interface ExerciseHistoryModalProps {
  exercise: Exercise;
  logs: WorkoutLog[];
  onClose: () => void;
}

const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });

export default function ExerciseHistoryModal({ exercise, logs, onClose }: ExerciseHistoryModalProps) {
  const history = useMemo(() => getExerciseHistory(exercise.id, logs, exercise), [exercise, logs]);
  const timed = isHold(exercise);
  const cardio = isCardio(exercise);

  const chart = useMemo(
    () =>
      [...history.sessions].reverse().map((s) => ({
        label: dayLabel(s.date),
        value: timed ? (s.best?.reps ?? 0) : s.bestE1rm || (s.best?.reps ?? 0),
      })),
    [history, timed]
  );

  const setText = (s: { weight: number; reps: number; distance?: number; rpe?: number }) => {
    if (cardio) {
      const sp = speedKmh(s.distance, s.reps);
      return `${formatDuration(s.reps)}${s.distance ? ` · ${formatEsNumber(s.distance, 2)} km` : ''}${sp ? ` · ${formatEsNumber(sp, 1)} km/h` : ''}${s.distance ? ` (${paceMinKm(s.distance, s.reps)}/km)` : ''}`;
    }
    if (timed) return formatDuration(s.reps);
    return `${formatEsNumber(s.weight)} kg × ${s.reps}${s.rpe ? ` @${s.rpe}` : ''}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Historial de ${exercise.name}`} onClick={onClose}>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-xl max-h-[92dvh] flex flex-col bg-slate-900 border border-slate-800 sm:rounded-3xl rounded-t-3xl shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-400 uppercase tracking-wider">
              <History className="h-3.5 w-3.5" />
              Historial
            </div>
            <h3 className="font-black text-white leading-tight">{exercise.name}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {history.sessions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Todavía no has hecho este ejercicio. Cuando lo hagas, aquí verás cada sesión y tu progreso.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Sesiones</div>
                  <div className="text-lg font-black text-white">{history.sessions.length}</div>
                </div>
                {!timed ? (
                  <>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Mejor peso</div>
                      <div className="text-lg font-black text-white">{formatEsNumber(history.bestWeight)} <span className="text-xs text-slate-400">kg</span></div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">1RM estimado</div>
                      <div className="text-lg font-black text-amber-300">{history.bestE1rm ? formatEsNumber(history.bestE1rm) : '—'} <span className="text-xs text-slate-400">kg</span></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Series</div>
                      <div className="text-lg font-black text-white">{history.totalSets}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Mejor tiempo</div>
                      <div className="text-lg font-black text-amber-300">{formatDuration(Math.max(...history.sessions.map((s) => s.best?.reps ?? 0)))}</div>
                    </div>
                  </>
                )}
              </div>

              {chart.length >= 2 && (
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} minTickGap={24} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={['dataMin', 'dataMax']} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [timed ? formatDuration(v) : `${formatEsNumber(v)} kg`, timed ? 'Mejor serie' : '1RM estimado']} />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 2.5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <ol className="space-y-2">
                {history.sessions.map((s) => (
                  <li key={s.logId} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-bold text-slate-100">{dayLabel(s.date)}</span>
                      <span className="text-[11px] text-slate-500 truncate">{s.routineName}</span>
                      {s.logId === history.bestSetLogId && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-amber-300 shrink-0">
                          <Trophy className="h-3 w-3" /> Récord
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.sets.map((set) => (
                        <span key={set.id} className={`px-2 py-0.5 rounded-md text-xs ${set.id === s.best?.id ? 'bg-blue-600/20 border border-blue-500/40 text-blue-200 font-bold' : 'bg-slate-900 border border-slate-800 text-slate-300'}`}>
                          {setText(set)}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
