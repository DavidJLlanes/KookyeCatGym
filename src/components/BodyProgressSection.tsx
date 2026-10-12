import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Ruler, ChevronDown, AlertCircle, ArrowRight, X, Images, CalendarDays, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MediaItem, MediaTarget, ProgressMuscle } from '../api/client';
import BODY_PATHS from '../data/bodyPaths';
import { BODY_PART_GROUP } from '../utils/muscleStats';
import { BodySide, LEVEL_FILL } from './MuscleMapVisual';
import PhotoCaptureButtons from './PhotoCaptureButtons';
import PhotoTile from './PhotoTile';
import {
  PROGRESS_MUSCLES,
  MUSCLE_COLOR,
  MEASURE_GUIDE,
  MEASURE_TIPS,
  MeasureUnit,
  byTakenAt,
  daysBetween,
  formatDay,
  formatMeasure,
  localDay,
  parseMeasure,
  capitalize,
} from '../utils/photoTools';

// Fotos de progreso físico por fecha y grupo muscular, con medida opcional.
// Se usa en Progreso → Físico y en la pestaña Fotos. El mapa muscular es el
// mismo de Progreso → Músculos: tocar un músculo filtra sus fotos.

export interface BodyProgressSectionProps {
  photos: MediaItem[];
  onUpload: (target: Extract<MediaTarget, { kind: 'progress' }>, file: File, onProgress: (fraction: number) => void) => Promise<void>;
  onUpdate: (id: string, changes: { takenAt?: string; muscle?: ProgressMuscle; measureMm?: number | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const UNIT_KEY = 'kookyecatgym-measure-unit';

function loadUnit(): MeasureUnit {
  try {
    return localStorage.getItem(UNIT_KEY) === 'mm' ? 'mm' : 'cm';
  } catch {
    return 'cm';
  }
}

function diffLabel(mm: number, unit: MeasureUnit): string {
  if (mm === 0) return 'sin cambios';
  return `${mm > 0 ? '+' : '−'}${formatMeasure(Math.abs(mm), unit)}`;
}

function MeasureInput({ value, onChange, unit, onUnit }: { value: string; onChange: (v: string) => void; unit: MeasureUnit; onUnit: (u: MeasureUnit) => void }) {
  return (
    <div className="flex gap-1.5">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={unit === 'cm' ? 'Ej. 38,5' : 'Ej. 385'}
        className="flex-1 min-w-0 px-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
      />
      <div className="flex p-1 bg-slate-950 border border-slate-700 rounded-xl">
        {(['cm', 'mm'] as MeasureUnit[]).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => onUnit(u)}
            className={`px-2.5 rounded-lg text-xs font-bold cursor-pointer ${unit === u ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  );
}

function MuscleChips({ value, onChange, counts }: { value: ProgressMuscle | null; onChange: (m: ProgressMuscle) => void; counts?: Record<string, number> }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {PROGRESS_MUSCLES.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
            value === m ? 'text-white border-transparent' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          style={value === m ? { backgroundColor: MUSCLE_COLOR[m] } : undefined}
        >
          {value !== m && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: MUSCLE_COLOR[m] }} />}
          {m}
          {counts && counts[m] > 0 && <span className="opacity-70 font-semibold">{counts[m]}</span>}
        </button>
      ))}
    </div>
  );
}

function EditPhotoDialog({
  photo,
  unit,
  onUnit,
  onSave,
  onClose,
}: {
  photo: MediaItem;
  unit: MeasureUnit;
  onUnit: (u: MeasureUnit) => void;
  onSave: BodyProgressSectionProps['onUpdate'];
  onClose: () => void;
}) {
  const [takenAt, setTakenAt] = useState(photo.takenAt);
  const [muscle, setMuscle] = useState<ProgressMuscle>(photo.muscle ?? 'Pecho');
  const toText = (mm: number | null, u: MeasureUnit) => (mm ? (u === 'cm' ? String(mm / 10).replace('.', ',') : String(mm)) : '');
  const [measure, setMeasure] = useState(toText(photo.measureMm, unit));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const changeUnit = (u: MeasureUnit) => {
    setMeasure(toText(parseMeasure(measure, unit), u));
    onUnit(u);
  };

  const save = async () => {
    const mm = measure.trim() ? parseMeasure(measure, unit) : null;
    if (measure.trim() && mm === null) {
      setError('La medida no es válida');
      return;
    }
    setBusy(true);
    try {
      await onSave(photo.id, { takenAt, muscle, measureMm: mm });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">Editar foto</h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <img src={photo.url} alt="" className="w-full max-h-48 object-cover rounded-xl" />
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fecha de la foto</label>
          <input
            type="date"
            value={takenAt}
            max={localDay()}
            onChange={(e) => setTakenAt(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-blue-500 [color-scheme:dark]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Grupo muscular</label>
          <MuscleChips value={muscle} onChange={setMuscle} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Medida (opcional)</label>
          <MeasureInput value={measure} onChange={setMeasure} unit={unit} onUnit={changeUnit} />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="button"
          onClick={save}
          disabled={busy || !takenAt}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold cursor-pointer"
        >
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

export default function BodyProgressSection({ photos, onUpload, onUpdate, onDelete }: BodyProgressSectionProps) {
  const [filter, setFilter] = useState<ProgressMuscle | null>(null);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [unit, setUnitState] = useState<MeasureUnit>(loadUnit);
  const setUnit = (u: MeasureUnit) => {
    setUnitState(u);
    try {
      localStorage.setItem(UNIT_KEY, u);
    } catch {
      // sin almacenamiento: solo dura esta sesión
    }
  };

  // Formulario de nueva foto
  const [newMuscle, setNewMuscle] = useState<ProgressMuscle>('Pecho');
  const [newDate, setNewDate] = useState(localDay());
  const [newMeasure, setNewMeasure] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MediaItem | null>(null);

  const sorted = useMemo(() => photos.filter((p) => p.mime.startsWith('image/')).sort(byTakenAt), [photos]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of sorted) if (p.muscle) c[p.muscle] = (c[p.muscle] ?? 0) + 1;
    return c;
  }, [sorted]);

  // Mapa muscular: cada zona se colorea según las fotos de su grupo
  const load = useMemo(() => {
    const l: Record<string, number> = {};
    for (const [part, group] of Object.entries(BODY_PART_GROUP)) l[part] = counts[group] ?? 0;
    return l;
  }, [counts]);
  const maxLoad = Math.max(0, ...Object.values(load));

  const selectMuscle = (m: ProgressMuscle) => {
    const next = filter === m ? null : m;
    setFilter(next);
    if (next) setNewMuscle(next);
  };
  const pickPart = (part: string) => {
    const group = BODY_PART_GROUP[part] as ProgressMuscle | undefined;
    if (group) selectMuscle(group);
  };

  const visible = filter ? sorted.filter((p) => p.muscle === filter) : sorted;
  const measured = visible.filter((p) => p.measureMm);

  // Línea de tiempo: por día, de lo más reciente a lo más antiguo
  const timeline = useMemo(() => {
    const byDay = new Map<string, MediaItem[]>();
    for (const p of [...visible].reverse()) {
      byDay.set(p.takenAt, [...(byDay.get(p.takenAt) ?? []), p]);
    }
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [visible]);

  // Última medida y cambio desde la primera, por grupo
  const summary = PROGRESS_MUSCLES.map((m) => {
    const list = sorted.filter((p) => p.muscle === m && p.measureMm);
    return {
      muscle: m,
      first: list[0],
      last: list[list.length - 1],
    };
  });

  const chartData = measured.map((p) => ({
    date: formatDay(p.takenAt, { day: 'numeric', month: 'short' }),
    value: unit === 'cm' ? p.measureMm! / 10 : p.measureMm!,
  }));

  const today = localDay();
  const firstDay = sorted[0]?.takenAt;

  const handleFiles = async (files: File[]) => {
    setError(null);
    const mm = newMeasure.trim() ? parseMeasure(newMeasure, unit) : null;
    if (newMeasure.trim() && mm === null) {
      setError(unit === 'cm' ? 'La medida no es válida (ej. 38,5)' : 'La medida no es válida (ej. 385)');
      return;
    }
    try {
      for (const file of files) {
        setProgress(0);
        await onUpload({ kind: 'progress', muscle: newMuscle, measureMm: mm, takenAt: newDate }, file, setProgress);
      }
      setNewMeasure('');
      setFilter(newMuscle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto.');
    } finally {
      setProgress(null);
    }
  };

  const before = visible[0];
  const after = visible[visible.length - 1];
  const guide = MEASURE_GUIDE[newMuscle];

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/60 p-5">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider text-blue-300">
              <Images className="h-3 w-3" /> Progreso físico
            </span>
            <h3 className="text-xl font-black text-white tracking-tight">Tu evolución en fotos</h3>
            <p className="text-xs text-slate-400 max-w-md">
              Fotos por fecha y grupo muscular, con la medida de cada músculo. Toca un músculo del mapa para ver solo sus fotos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <div className="text-lg font-black text-white leading-none">{sorted.length}</div>
              <div className="text-[10px] font-bold text-slate-500 mt-1">fotos</div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <div className="text-lg font-black text-white leading-none">{Object.keys(counts).length}/6</div>
              <div className="text-[10px] font-bold text-slate-500 mt-1">grupos</div>
            </div>
            {firstDay && (
              <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <div className="text-lg font-black text-white leading-none">{daysBetween(firstDay, today)}</div>
                <div className="text-[10px] font-bold text-slate-500 mt-1">días</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mapa muscular (el de Progreso → Músculos) */}
        <div className="min-w-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Filtrar por músculo</h4>
            {filter && (
              <button type="button" onClick={() => setFilter(null)} className="text-[11px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer">
                Ver todos
              </button>
            )}
          </div>
          <div className="flex gap-2 justify-center">
            <div className="flex-1 min-w-0">
              <BodySide view={BODY_PATHS.front} load={load} max={maxLoad} highlightGroup={filter ?? (hoveredPart ? BODY_PART_GROUP[hoveredPart] : null)} onHover={setHoveredPart} onPick={pickPart} />
            </div>
            <div className="flex-1 min-w-0">
              <BodySide view={BODY_PATHS.back} load={load} max={maxLoad} highlightGroup={filter ?? (hoveredPart ? BODY_PART_GROUP[hoveredPart] : null)} onHover={setHoveredPart} onPick={pickPart} />
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            Menos fotos
            {LEVEL_FILL.map((c) => (
              <span key={c} className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: c }} />
            ))}
            Más
          </div>
          <MuscleChips value={filter} onChange={selectMuscle} counts={counts} />
        </div>

        {/* Nueva foto */}
        <div className="min-w-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Añadir foto de progreso</h4>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Grupo muscular</label>
            <MuscleChips value={newMuscle} onChange={setNewMuscle} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fecha</label>
              <input
                type="date"
                value={newDate}
                max={today}
                onChange={(e) => setNewDate(e.target.value || today)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-blue-500 [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Medida (opcional)</label>
              <MeasureInput value={newMeasure} onChange={setNewMeasure} unit={unit} onUnit={setUnit} />
            </div>
          </div>

          {/* Cómo medir */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60">
            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left cursor-pointer"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Ruler className="h-4 w-4" style={{ color: MUSCLE_COLOR[newMuscle] }} />
                Cómo medir: {guide.name}
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${showGuide ? 'rotate-180' : ''}`} />
            </button>
            {showGuide && (
              <div className="px-3 pb-3 space-y-2.5">
                <ol className="space-y-1.5">
                  {guide.steps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                      <span
                        className="h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                        style={{ backgroundColor: MUSCLE_COLOR[newMuscle] }}
                      >
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Para que las medidas sean comparables</div>
                  {MEASURE_TIPS.map((tip) => (
                    <p key={tip} className="text-[11px] text-slate-400 leading-relaxed">• {tip}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {progress !== null ? (
            <div className="space-y-1">
              <div className="text-xs text-slate-400">Subiendo… {Math.round(progress * 100)}%</div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          ) : (
            <PhotoCaptureButtons onFiles={handleFiles} />
          )}
          {error && (
            <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/30 flex gap-2 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 p-10 text-center">
          <Images className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-semibold text-sm">Aún no tienes fotos de progreso</p>
          <p className="text-slate-500 text-xs mt-1">Haz la primera hoy: dentro de unas semanas podrás comparar el antes y el ahora.</p>
        </div>
      ) : (
        <>
          {/* Medidas por grupo (sin filtro) */}
          {!filter && summary.some((s) => s.last) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {summary.map(({ muscle, first, last }) => {
                const diff = first && last && first !== last ? last.measureMm! - first.measureMm! : null;
                const Icon = diff === null || diff === 0 ? Minus : diff > 0 ? TrendingUp : TrendingDown;
                return (
                  <button
                    key={muscle}
                    type="button"
                    onClick={() => selectMuscle(muscle)}
                    className="text-left p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: MUSCLE_COLOR[muscle] }} />
                      {muscle}
                    </div>
                    <div className="mt-1 text-base font-black text-white">{last ? formatMeasure(last.measureMm!, unit) : '—'}</div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Icon className="h-3 w-3" />
                      {diff !== null ? diffLabel(diff, unit) : last ? '1 medida' : 'sin medidas'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Antes / Ahora y gráfico de medidas del músculo elegido */}
          {filter && before && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  {filter}: antes y ahora
                </h4>
                {before === after ? (
                  <p className="text-xs text-slate-400">Solo hay una foto de {filter.toLowerCase()}. Añade otra más adelante para comparar.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ['Antes', before],
                        ['Ahora', after],
                      ].map(([label, p]) => {
                        const item = p as MediaItem;
                        return (
                          <div key={label as string} className="space-y-1.5">
                            <PhotoTile item={item} alt={`${filter} ${label}`} onDelete={onDelete} onEdit={() => setEditing(item)} />
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
          )}

          {/* Línea de tiempo */}
          <div className="space-y-4">
            {timeline.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No hay fotos de {filter?.toLowerCase()} todavía.</p>
            )}
            {timeline.map(([day, items]) => (
              <div key={day} className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-white">{capitalize(formatDay(day, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }))}</span>
                  <span className="text-[11px] text-slate-500">
                    {day === today ? 'hoy' : `hace ${daysBetween(day, today)} días`}
                  </span>
                  <span className="flex-1 h-px bg-slate-800" />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {items.map((p) => (
                    <PhotoTile
                      key={p.id}
                      item={p}
                      alt={`${p.muscle} ${day}`}
                      onDelete={onDelete}
                      onEdit={() => setEditing(p)}
                      caption={
                        <span className="flex items-center justify-between gap-1">
                          <span className="flex items-center gap-1 font-bold truncate">
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: MUSCLE_COLOR[p.muscle ?? 'Pecho'] }} />
                            {p.muscle}
                          </span>
                          {p.measureMm && <span className="font-semibold shrink-0">{formatMeasure(p.measureMm, unit)}</span>}
                        </span>
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editing && <EditPhotoDialog photo={editing} unit={unit} onUnit={setUnit} onSave={onUpdate} onClose={() => setEditing(null)} />}
    </div>
  );
}
