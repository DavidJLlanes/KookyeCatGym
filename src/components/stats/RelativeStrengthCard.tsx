import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Weight } from 'lucide-react';
import type { Exercise, WorkoutLog } from '../../types';
import type { BodyWeightEntry } from '../../utils/userData';
import { liftsRelativeToBodyWeight, totalLiftedKg } from '../../utils/bodyWeight';
import { cumulativeLifted, relativeStrengthHistory } from '../../utils/strengthHistory';
import { formatEsNumber } from '../../utils/number';

const formatDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const axis = { stroke: '#64748b', fontSize: 10, tickLine: false, axisLine: false } as const;
const tooltipStyle = { background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 };

interface Props {
  logs: WorkoutLog[];
  exercises: Exercise[];
  entries: BodyWeightEntry[];
}

/**
 * Fuerza relativa: mejor 1RM de cada ejercicio como múltiplo del peso corporal,
 * su evolución en % del peso, y el total levantado acumulado.
 */
export default function RelativeStrengthCard({ logs, exercises, entries }: Props) {
  const best = useMemo(() => liftsRelativeToBodyWeight(logs, exercises, entries).slice(0, 8), [logs, exercises, entries]);
  const history = useMemo(() => relativeStrengthHistory(logs, exercises, entries), [logs, exercises, entries]);
  const cumulative = useMemo(() => cumulativeLifted(logs, exercises), [logs, exercises]);
  const total = useMemo(() => totalLiftedKg(logs, exercises), [logs, exercises]);

  const [pickedId, setPickedId] = useState<string | null>(null);
  const selected = history.find((h) => h.exerciseId === pickedId) ?? history[0];
  const series = selected?.points.map((p) => ({ ...p, label: formatDay(p.date) })) ?? [];
  const totalSeries = cumulative.map((p) => ({ ...p, label: formatDay(p.date), toneladas: Math.round(p.total / 100) / 10 }));

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
      <div className="flex items-center gap-2">
        <Weight className="h-4 w-4 text-violet-400" />
        <h3 className="font-bold text-white text-sm">Fuerza relativa</h3>
      </div>

      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
        <div className="text-[11px] font-bold text-slate-500">Todo lo que has levantado</div>
        <div className="text-xl font-black text-white">
          {formatEsNumber(total / 1000, 1)} <span className="text-sm text-slate-400">toneladas</span>
        </div>
        {totalSeries.length > 1 && (
          <div className="h-28 mt-2" role="img" aria-label="Total levantado acumulado">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={totalSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="liftedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" {...axis} minTickGap={24} />
                <YAxis {...axis} width={48} tickFormatter={(v: number) => `${formatEsNumber(v, 1)} t`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${formatEsNumber(v, 1)} t`, 'Acumulado']} />
                <Area type="monotone" dataKey="toneladas" stroke="#a78bfa" strokeWidth={2} fill="url(#liftedFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {best.length === 0 ? (
        <p className="text-xs text-slate-500">Registra tu peso y entrena con carga para ver tu 1RM estimado como múltiplo de tu peso corporal.</p>
      ) : (
        <>
          <ul className="space-y-1.5">
            {best.map((l) => (
              <li key={l.exerciseId} className="flex items-center gap-3 text-sm">
                <span className="flex-1 min-w-0 truncate text-slate-300">{l.name}</span>
                <span className="text-xs text-slate-500 shrink-0">{formatEsNumber(l.e1rm, 0)} kg</span>
                <span className="w-14 text-right font-black text-violet-300 shrink-0">{formatEsNumber(l.ratio, 2)}×</span>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block" htmlFor="rel-exercise">
                Evolución en % de tu peso corporal
              </label>
              <select
                id="rel-exercise"
                value={selected.exerciseId}
                onChange={(e) => setPickedId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 cursor-pointer"
              >
                {history.map((h) => (
                  <option key={h.exerciseId} value={h.exerciseId}>
                    {h.name} · {h.latestPercent} %
                  </option>
                ))}
              </select>
              {series.length < 2 ? (
                <p className="text-xs text-slate-500">Hacen falta al menos dos sesiones con este ejercicio para dibujar la evolución.</p>
              ) : (
                <div className="h-40" role="img" aria-label={`Evolución de ${selected.name} en porcentaje del peso corporal`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="label" {...axis} minTickGap={24} />
                      <YAxis {...axis} width={48} tickFormatter={(v: number) => `${Math.round(v)} %`} domain={['dataMin - 5', 'dataMax + 5']} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: number, _n, item) => [`${v} % (${formatEsNumber(item.payload.e1rm, 1)} kg con ${formatEsNumber(item.payload.bodyKg, 1)} kg de peso)`, '1RM']}
                      />
                      <Line type="monotone" dataKey="percent" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
