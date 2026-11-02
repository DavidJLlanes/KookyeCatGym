import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea } from 'recharts';
import { Scale, Target, Trash2, TrendingDown, TrendingUp, Minus, Weight } from 'lucide-react';
import type { Exercise, WorkoutLog } from '../types';
import { useUserData } from '../context/UserDataContext';
import { BodyGoal, localDayKey } from '../utils/userData';
import { goalStatus, liftsRelativeToBodyWeight, removeWeight, totalLiftedKg, upsertWeight, weeklyRateKg } from '../utils/bodyWeight';
import { formatEsNumber } from '../utils/number';
import DecimalInput from './DecimalInput';

const MODE_LABEL: Record<BodyGoal['mode'], string> = { lose: 'Perder', gain: 'Ganar', hold: 'Mantener' };

const formatDayLabel = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const signed = (n: number, digits = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatEsNumber(Math.abs(n), digits)}`;

/**
 * Peso corporal frente a un objetivo (perder, ganar o mantener), con el ritmo
 * semanal real, cuánto falta, y tus levantamientos como múltiplo de tu peso.
 */
export default function BodyWeightSection({ logs, exercises }: { logs: WorkoutLog[]; exercises: Exercise[] }) {
  const { data, setValue } = useUserData();
  const entries = data['body-weights'];
  const goal = data['body-goal'];

  const [kg, setKg] = useState(0);
  const [day, setDay] = useState(localDayKey());
  const [editingGoal, setEditingGoal] = useState(false);
  const [gMode, setGMode] = useState<BodyGoal['mode']>(goal?.mode ?? 'lose');
  const [gTarget, setGTarget] = useState(goal?.targetKg ?? 0);
  const [gTol, setGTol] = useState(goal?.toleranceKg ?? 1);
  const [gRate, setGRate] = useState(goal?.plannedRateKg ?? 0);

  const status = useMemo(() => (goal ? goalStatus(entries, goal) : null), [entries, goal]);
  const rate = useMemo(() => weeklyRateKg(entries), [entries]);
  const relLifts = useMemo(() => liftsRelativeToBodyWeight(logs, exercises, entries).slice(0, 8), [logs, exercises, entries]);
  const total = useMemo(() => totalLiftedKg(logs, exercises), [logs, exercises]);

  const chartData = useMemo(() => entries.map((e) => ({ date: e.date, label: formatDayLabel(e.date), kg: e.kg })), [entries]);
  const [yMin, yMax] = useMemo(() => {
    const vals = entries.map((e) => e.kg);
    if (goal) vals.push(goal.targetKg);
    if (vals.length === 0) return [0, 100];
    return [Math.floor(Math.min(...vals) - 1), Math.ceil(Math.max(...vals) + 1)];
  }, [entries, goal]);

  const addEntry = () => {
    if (kg < 20 || kg > 400 || !/^\d{4}-\d{2}-\d{2}$/.test(day) || day > localDayKey()) return;
    setValue('body-weights', upsertWeight(entries, day, Math.round(kg * 10) / 10));
    setKg(0);
  };

  const saveGoal = () => {
    if (gTarget < 20 || gTarget > 400) return;
    setValue('body-goal', {
      mode: gMode,
      targetKg: gTarget,
      ...(gMode === 'hold' ? { toleranceKg: gTol > 0 ? gTol : 1 } : {}),
      ...(gMode !== 'hold' && gRate > 0 ? { plannedRateKg: gRate } : {}),
    });
    setEditingGoal(false);
  };

  const TrendIcon = rate === null ? Minus : rate < -0.05 ? TrendingDown : rate > 0.05 ? TrendingUp : Minus;
  const recent = [...entries].reverse().slice(0, 6);
  const card = 'p-4 bg-slate-900 rounded-2xl border border-slate-800';

  return (
    <div className="space-y-4" id="body-weight-section">
      {/* Registrar peso */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <Scale className="h-4 w-4 text-blue-400" />
          <h3 className="font-bold text-white text-sm">Peso corporal</h3>
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1 min-w-0">
            <label htmlFor="bw-kg" className="block text-[11px] font-bold text-slate-500 mb-1">Peso (kg)</label>
            <DecimalInput id="bw-kg" value={kg} onChange={setKg} placeholder="Ej. 78,4" className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none" />
          </div>
          <div>
            <label htmlFor="bw-day" className="block text-[11px] font-bold text-slate-500 mb-1">Fecha</label>
            <input id="bw-day" type="date" value={day} max={localDayKey()} onChange={(e) => setDay(e.target.value)} className="px-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl text-sm text-white outline-none" />
          </div>
          <button type="button" onClick={addEntry} disabled={kg < 20} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-sm font-bold cursor-pointer">
            Añadir
          </button>
        </div>
        {entries.length === 0 && <p className="text-xs text-slate-500 mt-3">Apunta tu peso de vez en cuando (mejor en ayunas y a la misma hora) y verás tu tendencia y el ritmo semanal.</p>}
      </div>

      {/* Gráfica */}
      {entries.length > 0 && (
        <div className={card}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-2xl font-black text-white">{formatEsNumber(entries[entries.length - 1].kg, 1)} <span className="text-sm font-bold text-slate-400">kg</span></div>
              <div className="text-[11px] text-slate-500">{formatDayLabel(entries[entries.length - 1].date)}</div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 text-sm font-bold text-slate-200">
                <TrendIcon className={`h-4 w-4 ${rate !== null && rate < -0.05 ? 'text-emerald-400' : rate !== null && rate > 0.05 ? 'text-amber-400' : 'text-slate-400'}`} />
                {rate === null ? '—' : `${signed(rate, 2)} kg/sem`}
              </div>
              <div className="text-[11px] text-slate-500">{rate === null ? 'Hacen falta 3 pesajes en 7+ días' : 'ritmo de las últimas 4 semanas'}</div>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} minTickGap={24} />
                <YAxis domain={[yMin, yMax]} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`${formatEsNumber(v, 1)} kg`, 'Peso']} />
                {goal && goal.mode === 'hold' && <ReferenceArea y1={goal.targetKg - (goal.toleranceKg ?? 1)} y2={goal.targetKg + (goal.toleranceKg ?? 1)} fill="#10b981" fillOpacity={0.1} />}
                {goal && <ReferenceLine y={goal.targetKg} stroke="#10b981" strokeDasharray="5 4" label={{ value: 'Objetivo', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} />}
                <Line type="monotone" dataKey="kg" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 2.5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recent.map((e) => (
              <span key={e.date} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300">
                {formatDayLabel(e.date)} · <b className="text-white">{formatEsNumber(e.kg, 1)}</b>
                <button type="button" aria-label={`Borrar el pesaje del ${formatDayLabel(e.date)}`} onClick={() => setValue('body-weights', removeWeight(entries, e.date))} className="p-1 text-slate-500 hover:text-red-400 cursor-pointer">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Objetivo */}
      <div className={card}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Objetivo</h3>
          </div>
          {goal && !editingGoal && (
            <div className="flex gap-3 text-xs">
              <button type="button" onClick={() => { setGMode(goal.mode); setGTarget(goal.targetKg); setGTol(goal.toleranceKg ?? 1); setGRate(goal.plannedRateKg ?? 0); setEditingGoal(true); }} className="text-blue-400 hover:text-blue-300 font-bold cursor-pointer">Editar</button>
              <button type="button" onClick={() => setValue('body-goal', null)} className="text-slate-500 hover:text-red-400 font-bold cursor-pointer">Quitar</button>
            </div>
          )}
        </div>

        {(!goal || editingGoal) && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1.5">
              {(['lose', 'gain', 'hold'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setGMode(m)} className={`py-2 rounded-xl text-xs font-bold border cursor-pointer ${gMode === m ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                  {MODE_LABEL[m]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="goal-target" className="block text-[11px] font-bold text-slate-500 mb-1">Peso objetivo (kg)</label>
                <DecimalInput id="goal-target" value={gTarget} onChange={setGTarget} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-sm text-white outline-none" />
              </div>
              {gMode === 'hold' ? (
                <div>
                  <label htmlFor="goal-tol" className="block text-[11px] font-bold text-slate-500 mb-1">Margen (± kg)</label>
                  <DecimalInput id="goal-tol" value={gTol} onChange={setGTol} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-sm text-white outline-none" />
                </div>
              ) : (
                <div>
                  <label htmlFor="goal-rate" className="block text-[11px] font-bold text-slate-500 mb-1">Ritmo previsto (kg/sem, opcional)</label>
                  <DecimalInput id="goal-rate" value={gRate} onChange={setGRate} placeholder="Ej. 0,5" className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none" />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              {editingGoal && <button type="button" onClick={() => setEditingGoal(false)} className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer">Cancelar</button>}
              <button type="button" onClick={saveGoal} disabled={gTarget < 20} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold cursor-pointer">Guardar objetivo</button>
            </div>
          </div>
        )}

        {goal && !editingGoal && (
          <div className="space-y-1.5 text-sm">
            <div className="text-slate-300">
              {MODE_LABEL[goal.mode]} hasta <b className="text-white">{formatEsNumber(goal.targetKg, 1)} kg</b>
              {goal.mode === 'hold' && <span className="text-slate-500"> (± {formatEsNumber(goal.toleranceKg ?? 1, 1)})</span>}
            </div>
            {!status && <p className="text-xs text-slate-500">Añade un pesaje para ver cuánto te falta.</p>}
            {status && (
              <>
                <div className={status.reached ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                  {status.reached ? '¡Objetivo conseguido!' : `Te faltan ${formatEsNumber(Math.abs(status.remainingKg), 1)} kg (${status.remainingKg < 0 ? 'bajar' : 'subir'})`}
                </div>
                {!status.reached && status.rateKgPerWeek !== null && (
                  <div className="text-xs text-slate-400">
                    {status.weeksToGo !== null
                      ? `Al ritmo actual (${signed(status.rateKgPerWeek, 2)} kg/sem) llegarías en unas ${formatEsNumber(status.weeksToGo, 0)} semanas.`
                      : `Con el ritmo actual (${signed(status.rateKgPerWeek, 2)} kg/sem) no te acercas al objetivo.`}
                  </div>
                )}
                {status.vsPlan && (
                  <div className={`text-xs font-bold ${status.vsPlan === 'onPlan' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {status.vsPlan === 'onPlan' ? 'Vas al ritmo previsto.' : status.vsPlan === 'faster' ? 'Vas más rápido de lo previsto.' : 'Vas más lento de lo previsto.'}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Levantamientos relativos y total acumulado */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <Weight className="h-4 w-4 text-violet-400" />
          <h3 className="font-bold text-white text-sm">Fuerza relativa</h3>
        </div>
        <div className="mb-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-bold text-slate-500">Todo lo que has levantado</div>
          <div className="text-xl font-black text-white">{formatEsNumber(total / 1000, 1)} <span className="text-sm text-slate-400">toneladas</span></div>
        </div>
        {relLifts.length === 0 ? (
          <p className="text-xs text-slate-500">Registra tu peso y entrena con carga para ver tu 1RM estimado como múltiplo de tu peso corporal.</p>
        ) : (
          <ul className="space-y-1.5">
            {relLifts.map((l) => (
              <li key={l.exerciseId} className="flex items-center gap-3 text-sm">
                <span className="flex-1 min-w-0 truncate text-slate-300">{l.name}</span>
                <span className="text-xs text-slate-500 shrink-0">{formatEsNumber(l.e1rm, 0)} kg</span>
                <span className="w-14 text-right font-black text-violet-300 shrink-0">{formatEsNumber(l.ratio, 2)}×</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
