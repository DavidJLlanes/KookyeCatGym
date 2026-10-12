import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Camera, Dumbbell, Images, History } from 'lucide-react';
import type { MediaItem } from '../api/client';
import type { WorkoutLog } from '../types';
import WorkoutPhotos from './WorkoutPhotos';
import PhotoTile from './PhotoTile';
import BodyProgressSection, { BodyProgressSectionProps } from './BodyProgressSection';
import { capitalize, formatDay, localDay } from '../utils/photoTools';

// Pestaña Fotos: calendario de fotos de entrenamiento y, debajo, el progreso físico.

interface PhotosPanelProps {
  photos: MediaItem[]; // todas las del usuario
  logs: WorkoutLog[];
  activeWorkoutKey: string | null;
  activeWorkoutName: string | null;
  onUploadWorkoutPhoto: (logId: string, file: File, onProgress: (fraction: number) => void) => Promise<void>;
  onUploadProgressPhoto: BodyProgressSectionProps['onUpload'];
  onUpdatePhoto: BodyProgressSectionProps['onUpdate'];
  onDeletePhoto: (id: string) => Promise<void>;
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function PhotosPanel({
  photos,
  logs,
  activeWorkoutKey,
  activeWorkoutName,
  onUploadWorkoutPhoto,
  onUploadProgressPhoto,
  onUpdatePhoto,
  onDeletePhoto,
}: PhotosPanelProps) {
  const today = localDay();
  const workoutPhotos = useMemo(() => photos.filter((p) => p.kind === 'workout'), [photos]);
  const progressPhotos = useMemo(() => photos.filter((p) => p.kind === 'progress'), [photos]);

  // Entrenamientos y fotos por día
  const logsByDay = useMemo(() => {
    const map = new Map<string, WorkoutLog[]>();
    for (const log of logs) {
      const day = localDay(new Date(log.date));
      map.set(day, [...(map.get(day) ?? []), log]);
    }
    return map;
  }, [logs]);
  const photosByDay = useMemo(() => {
    const map = new Map<string, MediaItem[]>();
    for (const p of workoutPhotos) map.set(p.takenAt, [...(map.get(p.takenAt) ?? []), p]);
    return map;
  }, [workoutPhotos]);

  const lastPhotoDay = useMemo(() => [...photosByDay.keys()].sort().pop() ?? today, [photosByDay, today]);
  const [month, setMonth] = useState(() => {
    const [y, m] = lastPhotoDay.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });
  const [selectedDay, setSelectedDay] = useState<string>(lastPhotoDay);

  // Cuadrícula del mes, empezando en lunes
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const list: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(localDay(new Date(month.getFullYear(), month.getMonth(), d)));
    while (list.length % 7) list.push(null);
    return list;
  }, [month]);

  const monthPhotoCount = cells.reduce((sum, day) => sum + (day ? photosByDay.get(day)?.length ?? 0 : 0), 0);
  const changeMonth = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  const goToday = () => {
    setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    setSelectedDay(today);
  };

  // Lo que se muestra del día elegido: cada entrenamiento con sus fotos, más
  // las fotos sueltas (de un entrenamiento borrado o cancelado)
  const dayLogs = logsByDay.get(selectedDay) ?? [];
  const dayPhotos = photosByDay.get(selectedDay) ?? [];
  const logIds = new Set(logs.map((l) => l.id));
  const showActive = activeWorkoutKey && selectedDay === today;
  const orphanPhotos = dayPhotos.filter((p) => !p.logId || (!logIds.has(p.logId) && p.logId !== activeWorkoutKey));
  // Todas las fotos de ese entrenamiento (aunque alguna tenga otra fecha)
  const otherDayPhotos = (logId: string) => workoutPhotos.filter((p) => p.logId === logId);

  return (
    <div className="space-y-8 text-left">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
          <Images className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-black text-white text-lg tracking-tight">Fotos</h2>
          <p className="text-xs text-slate-400">Tus fotos de entrenamiento y de progreso físico. Solo las ves tú.</p>
        </div>
      </div>

      {/* --- Fotos de entrenamiento --- */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-blue-400" />
          <h3 className="font-extrabold text-slate-200 text-base">Fotos de entrenamiento</h3>
          <span className="text-xs text-slate-500">({workoutPhotos.length})</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Calendario */}
          <div className="lg:col-span-3 min-w-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => changeMonth(-1)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer" title="Mes anterior">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <div className="font-black text-white">
                  {capitalize(month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))}
                </div>
                <div className="text-[11px] text-slate-500">
                  {monthPhotoCount} {monthPhotoCount === 1 ? 'foto' : 'fotos'} este mes
                </div>
              </div>
              <button type="button" onClick={() => changeMonth(1)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer" title="Mes siguiente">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-500">
              {WEEKDAYS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={`e${i}`} />;
                const list = photosByDay.get(day) ?? [];
                const cover = list.find((p) => p.mime.startsWith('image/'));
                const trained = logsByDay.has(day);
                const isSelected = day === selectedDay;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`relative aspect-square rounded-lg overflow-hidden border text-left cursor-pointer transition-all ${
                      isSelected ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-800 hover:border-slate-600'
                    } ${cover ? '' : trained ? 'bg-blue-950/30' : 'bg-slate-950/60'}`}
                  >
                    {cover && <img src={cover.url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
                    {!cover && list.length > 0 && <div className="absolute inset-0 bg-slate-800" />}
                    <span
                      className={`absolute top-0.5 left-1 text-[10px] sm:text-xs font-black ${
                        cover ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]' : day === today ? 'text-blue-400' : 'text-slate-400'
                      }`}
                    >
                      {Number(day.slice(8))}
                    </span>
                    {list.length > 1 && (
                      <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-blue-600 text-[9px] font-black text-white">{list.length}</span>
                    )}
                    {!cover && trained && list.length === 0 && (
                      <Dumbbell className="absolute bottom-1 right-1 h-2.5 w-2.5 text-blue-500/70" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <Dumbbell className="h-3 w-3 text-blue-500/70" /> día entrenado sin fotos
              </span>
              <button type="button" onClick={goToday} className="font-bold text-blue-400 hover:text-blue-300 cursor-pointer">
                Hoy
              </button>
            </div>
          </div>

          {/* Día elegido */}
          <div className="lg:col-span-2 min-w-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="font-black text-white">{capitalize(formatDay(selectedDay, { weekday: 'long', day: 'numeric', month: 'long' }))}</div>

            {showActive && activeWorkoutKey && (
              <div className="space-y-2 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <div className="text-xs font-bold text-emerald-300">En curso: {activeWorkoutName}</div>
                <WorkoutPhotos
                  title={activeWorkoutName ?? 'Entrenamiento'}
                  photos={workoutPhotos.filter((p) => p.logId === activeWorkoutKey)}
                  onUpload={(file, onProgress) => onUploadWorkoutPhoto(activeWorkoutKey, file, onProgress)}
                  onDelete={onDeletePhoto}
                />
              </div>
            )}

            {dayLogs.map((log) => (
              <div key={log.id} className="space-y-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-200 truncate">{log.routineName}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(log.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <WorkoutPhotos
                  title={log.routineName}
                  photos={otherDayPhotos(log.id)}
                  onUpload={(file, onProgress) => onUploadWorkoutPhoto(log.id, file, onProgress)}
                  onDelete={onDeletePhoto}
                />
              </div>
            ))}

            {/* Fotos de un entrenamiento que ya no está en el historial (borrado o cancelado) */}
            {orphanPhotos.length > 0 && (
              <div className="space-y-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                <div className="text-xs font-bold text-slate-300">Fotos de un entrenamiento que ya no está en el historial</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {orphanPhotos.map((p) => (
                    <PhotoTile key={p.id} item={p} alt="Entrenamiento" onDelete={onDeletePhoto} />
                  ))}
                </div>
              </div>
            )}

            {dayLogs.length === 0 && dayPhotos.length === 0 && !showActive && (
              <div className="text-center py-6 space-y-2">
                <History className="h-8 w-8 text-slate-700 mx-auto" />
                <p className="text-xs text-slate-500">Este día no entrenaste ni hay fotos.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- Fotos de progreso físico --- */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-blue-400" />
          <h3 className="font-extrabold text-slate-200 text-base">Fotos de progreso</h3>
          <span className="text-xs text-slate-500">({progressPhotos.length})</span>
        </div>
        <BodyProgressSection photos={progressPhotos} onUpload={onUploadProgressPhoto} onUpdate={onUpdatePhoto} onDelete={onDeletePhoto} />
      </section>
    </div>
  );
}
