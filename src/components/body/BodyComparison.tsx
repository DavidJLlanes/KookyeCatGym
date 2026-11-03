import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ArrowRight, CalendarDays} from 'lucide-react';
import type { MediaItem, ProgressMuscle } from '../../api/client';
import PhotoTile from '../PhotoTile';
import BeforeAfterSlider from '../BeforeAfterSlider';
import {
  MUSCLE_COLOR,
  MeasureUnit,
  daysBetween,
  formatDay,
  formatMeasure} from '../../utils/photoTools';
import { diffLabel } from './measureUnit';

interface BodyComparisonProps {
  filter: ProgressMuscle;
  before: MediaItem;
  after: MediaItem | undefined;
  chartData: { date: string; value: number }[];
  compareMode: 'slider' | 'side';
  setCompareMode: (mode: 'slider' | 'side') => void;
  unit: MeasureUnit;
  onDelete: (id: string) => Promise<void>;
  onEdit: (photo: MediaItem) => void;
}

/** Antes / Ahora (deslizador o lado a lado) y gráfico de medidas del músculo elegido. */
export default function BodyComparison({ filter, before, after, chartData, compareMode, setCompareMode, unit, onDelete, onEdit }: BodyComparisonProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
          {filter}: antes y ahora
        </h4>
        {before === after ? (
          <p className="text-xs text-slate-400">Solo hay una foto de {filter.toLowerCase()}. Añade otra más adelante para comparar.</p>
        ) : (
          <>
            <div role="tablist" aria-label="Modo de comparación" className="flex gap-2">
              {([['side', 'Lado a lado'], ['slider', 'Deslizador']] as const).map(([id, text]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={compareMode === id}
                  onClick={() => setCompareMode(id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${compareMode === id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                >
                  {text}
                </button>
              ))}
            </div>
            {compareMode === 'slider' && (before.mime.startsWith('image/') && after.mime.startsWith('image/') ? (
              <BeforeAfterSlider
                beforeUrl={before.url}
                afterUrl={after.url}
                beforeLabel={`Antes · ${formatDay(before.takenAt, { day: 'numeric', month: 'short' })}`}
                afterLabel={`Ahora · ${formatDay(after.takenAt, { day: 'numeric', month: 'short' })}`}
                alt={filter}
              />
            ) : (
              <p className="text-xs text-slate-400">El deslizador solo funciona con fotos, no con vídeos.</p>
            ))}
            <div className={`grid grid-cols-2 gap-2 ${compareMode === 'slider' ? 'hidden' : ''}`}>
              {[
                ['Antes', before],
                ['Ahora', after],
              ].map(([label, p]) => {
                const item = p as MediaItem;
                return (
                  <div key={label as string} className="space-y-1.5">
                    <PhotoTile item={item} alt={`${filter} ${label}`} onDelete={onDelete} onEdit={() => onEdit(item)} />
                    <div className="text-center">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label as string}</div>
                      <div className="text-xs font-bold text-slate-200">{formatDay(item.takenAt, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      {item.measureMm && <div className="text-xs text-slate-400">{formatMeasure(item.measureMm, unit)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-300 bg-slate-950/60 rounded-xl py-2">
              <CalendarDays className="h-3.5 w-3.5 text-blue-400" />
              {daysBetween(before.takenAt, after.takenAt)} días
              {before.measureMm && after.measureMm && (
                <>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                  <span className="font-bold" style={{ color: MUSCLE_COLOR[filter] }}>
                    {diffLabel(after.measureMm - before.measureMm, unit)}
                  </span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Medida de {filter.toLowerCase()} ({unit})</h4>
        {chartData.length >= 2 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBodyMeasure" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={MUSCLE_COLOR[filter]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={MUSCLE_COLOR[filter]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  formatter={(v: any) => [`${String(v).replace('.', ',')} ${unit}`, 'Medida']}
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="value" stroke={MUSCLE_COLOR[filter]} strokeWidth={2.5} fill="url(#colorBodyMeasure)" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-6 text-center">
            {chartData.length === 1 ? 'Con una segunda medida verás aquí la gráfica.' : 'Añade la medida al subir las fotos para ver su evolución.'}
          </p>
        )}
      </div>
    </div>
  );
}
