import React, { useMemo, useState } from 'react';
import { CalendarDays, Check, Play, Settings2, TrendingDown } from 'lucide-react';
import type { Exercise, Routine, WorkoutLog } from '../types';
import MiniBodyMap from './muscle/MiniBodyMap';
import { routineMuscles } from '../utils/sessionMuscles';
import { useUserData } from '../context/UserDataContext';
import { DAY_NAMES, DAY_SHORT, PlannedSession, buildWeek, moveSession, weekStartKey } from '../utils/weekPlan';
import { isDeloadWeek, weeksUntilDeload } from '../utils/deload';

/**
 * La semana de un vistazo: qué rutina toca cada día (según los días de cada
 * rutina), cuáles ya hiciste, y la opción de mover una sesión a otro día solo
 * esta semana. Aquí también se elige con qué día empieza la semana y se planean
 * las semanas de descarga.
 */
export default function WeekPlanCard({ routines, logs, exercises, onStart }: { routines: Routine[]; logs: WorkoutLog[]; exercises: Exercise[]; onStart: (r: Routine) => void }) {
  const { data, setValue } = useUserData();
  const weekStart = data['week-start'];
  const moves = data['plan-moves'];
  const deload = data.deload;
  const [moving, setMoving] = useState<{ routineId: string; fromDay: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const today = new Date();
  const week = useMemo(() => buildWeek(routines, moves, logs, today, weekStart), [routines, moves, logs, weekStart]); // eslint-disable-line react-hooks/exhaustive-deps
  const startKey = weekStartKey(today, weekStart);
  const hasAny = week.some((d) => d.sessions.length > 0);
  const deloadNow = isDeloadWeek(deload, today, weekStart);
  const untilDeload = weeksUntilDeload(deload, today, weekStart);
  const manualNow = deload.manualWeeks.includes(startKey);

  const move = (s: PlannedSession, to: number) => {
    setValue('plan-moves', moveSession(moves, startKey, s.routine.id, s.fromDay, to));
    setMoving(null);
  };

  const toggleManualDeload = () =>
    setValue('deload', { ...deload, manualWeeks: manualNow ? deload.manualWeeks.filter((w) => w !== startKey) : [...deload.manualWeeks, startKey].slice(-12) });

  const setDeload = (patch: Partial<typeof deload>) => setValue('deload', { ...deload, ...patch });

  if (!hasAny && !deloadNow && !deload.enabled && !showSettings) {
    // Sin días en las rutinas y sin descarga: solo un acceso discreto a los ajustes del plan
    return (
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-300 cursor-pointer">
          <Settings2 className="h-3.5 w-3.5" /> Ajustes del plan semanal
        </button>
      </div>
    );
  }

  return (
    <div id="week-plan-card" className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="h-5 w-5 text-blue-400 shrink-0" />
          <h3 className="font-extrabold text-slate-100 text-base">Esta semana</h3>
        </div>
        <button type="button" onClick={() => setShowSettings(!showSettings)} aria-expanded={showSettings} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer shrink-0">
          <Settings2 className="h-3.5 w-3.5" /> Ajustes
        </button>
      </div>

      {deloadNow && (
        <div role="status" className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-xs text-sky-200 flex gap-2">
          <TrendingDown className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <b>Semana de descarga.</b> Las rutinas que empieces se preparan con menos series y menos peso ({deload.setsPercent} % de las series, {deload.loadPercent} % del peso). Esta semana no cambia tu progresión: después retomas la carga de antes.
          </span>
        </div>
      )}
      {!deloadNow && untilDeload !== null && untilDeload <= 1 && (
        <p className="text-xs text-slate-400">La próxima semana toca descarga.</p>
      )}

      {hasAny ? (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-1.5">
          {week.map((d) => (
            <div key={d.date} className={`min-w-0 flex sm:block items-start gap-3 rounded-xl border p-2 sm:p-1.5 sm:min-h-[4.5rem] ${d.isToday ? 'border-blue-500/60 bg-blue-950/20' : 'border-slate-800 bg-slate-950/40'}`}>
              <div className={`w-14 shrink-0 pt-1 sm:w-auto sm:pt-0 text-[11px] sm:text-[10px] font-black uppercase leading-tight sm:text-center ${d.isToday ? 'text-blue-300' : 'text-slate-500'}`}>
                {DAY_SHORT[d.dayIndex]}
                <span className="ml-1 sm:ml-0 sm:block font-bold text-slate-500">{Number(d.date.slice(8))}</span>
              </div>
              <div className="min-w-0 flex-1 sm:mt-1 space-y-1">
                {d.sessions.length === 0 && <div className="pt-1 text-xs text-slate-600 sm:hidden">Descanso</div>}
                {d.sessions.map((s) => {
                  const key = `${s.routine.id}-${s.fromDay}`;
                  const open = moving?.routineId === s.routine.id && moving.fromDay === s.fromDay;
                  return (
                    <div key={key} className="relative">
                      <button
                        type="button"
                        onClick={() => setMoving(open ? null : { routineId: s.routine.id, fromDay: s.fromDay })}
                        aria-expanded={open}
                        title={`${s.routine.name}${s.moved ? ' (movida)' : ''}${s.done ? ' · hecha' : ''}`}
                        className={`w-full px-2.5 py-2 sm:px-1 sm:py-1 min-h-[2.25rem] rounded-lg text-xs sm:text-[10px] font-bold leading-tight break-words text-left cursor-pointer border ${
                          s.done ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : s.moved ? 'bg-violet-950/40 border-violet-500/40 text-violet-200' : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-blue-500/50'
                        }`}
                      >
                        {s.done && <Check className="inline h-2.5 w-2.5 mr-0.5" />}
                        {s.routine.name}
                      </button>
                      {open && (
                        <div className="absolute z-20 left-0 top-full mt-1 w-44 p-2 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl space-y-1.5">
                          <MiniBodyMap sets={routineMuscles(s.routine, exercises)} height={72} className="mx-auto flex justify-center w-full" />
                          {!s.done && (
                            <button type="button" onClick={() => { setMoving(null); onStart(s.routine); }} className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer">
                              <Play className="h-3 w-3" /> Empezar ahora
                            </button>
                          )}
                          <div className="text-[10px] font-bold text-slate-400 uppercase px-0.5">Mover esta semana a</div>
                          <div className="grid grid-cols-4 gap-1">
                            {DAY_SHORT.map((label, idx) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => move(s, idx)}
                                aria-label={`Mover al ${DAY_NAMES[idx]}`}
                                aria-pressed={idx === s.day}
                                className={`py-1 rounded-md text-[10px] font-bold cursor-pointer ${idx === s.day ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {s.moved && (
                            <button type="button" onClick={() => move(s, s.fromDay)} className="w-full text-[11px] font-bold text-violet-300 hover:text-violet-200 cursor-pointer">
                              Volver a su día ({DAY_NAMES[s.fromDay]})
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">Ninguna rutina tiene días asignados («Lunes», «Martes y Viernes»...). Ponles día al editarlas y aquí verás tu semana.</p>
      )}

      {showSettings && (
        <div className="pt-3 border-t border-slate-800 space-y-4">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">La semana empieza en</div>
            <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl">
              {(['mon', 'sun'] as const).map((w) => (
                <button key={w} type="button" onClick={() => setValue('week-start', w)} aria-pressed={weekStart === w} className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${weekStart === w ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                  {w === 'mon' ? 'Lunes' : 'Domingo'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Semanas de descarga</div>
            <label className="flex items-center gap-3 text-sm text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={deload.enabled}
                onChange={(e) => setDeload({ enabled: e.target.checked, startWeek: e.target.checked && !deload.startWeek ? startKey : deload.startWeek })}
                className="h-4 w-4 accent-blue-500"
              />
              Planificar una descarga cada
              <select
                value={deload.everyWeeks}
                onChange={(e) => setDeload({ everyWeeks: Number(e.target.value) })}
                aria-label="Cada cuántas semanas"
                className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              >
                {[3, 4, 5, 6, 8].map((n) => (
                  <option key={n} value={n}>{n} semanas</option>
                ))}
              </select>
            </label>
            {deload.enabled && (
              <p className="text-xs text-slate-500">
                El ciclo empezó la semana del {deload.startWeek}; la descarga es la última de cada ciclo.{' '}
                <button type="button" onClick={() => setDeload({ startWeek: startKey })} className="font-bold text-blue-400 hover:text-blue-300 cursor-pointer">Empezar el ciclo esta semana</button>
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-400">
                Peso (% del habitual)
                <input type="number" min={30} max={100} value={deload.loadPercent} onChange={(e) => setDeload({ loadPercent: Math.min(100, Math.max(30, Number(e.target.value) || 90)) })} className="mt-1 w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100" />
              </label>
              <label className="text-xs text-slate-400">
                Series (% de las habituales)
                <input type="number" min={30} max={100} value={deload.setsPercent} onChange={(e) => setDeload({ setsPercent: Math.min(100, Math.max(30, Number(e.target.value) || 60)) })} className="mt-1 w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100" />
              </label>
            </div>
            <button type="button" onClick={toggleManualDeload} className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer border ${manualNow ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-sky-500/50'}`}>
              {manualNow ? '✓ Esta semana es de descarga (quitar)' : 'Marcar esta semana como descarga'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
