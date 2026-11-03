import { Award, Calendar, ChevronRight, History, Pencil, Plus, X } from 'lucide-react';
import { Exercise, WorkoutLog } from '../../types';
import * as api from '../../api/client';
import { formatEsNumber } from '../../utils/number';
import { formatReps } from '../../utils/holdSets';
import WorkoutPhotos from '../WorkoutPhotos';

interface WorkoutHistoryProps {
  logs: WorkoutLog[];
  exercises: Exercise[];
  workoutPhotos: api.MediaItem[];
  onGoToProgress: () => void;
  onAddPast: () => void;
  onEditLog: (log: WorkoutLog) => void;
  onDeleteLog: (logId: string) => void;
  onUploadPhoto: (logId: string, file: File, onProgress: (fraction: number) => void) => Promise<void>;
  onDeletePhoto: (id: string) => Promise<void>;
}

/** Resumen del último entrenamiento + historial reciente con fotos. */
export default function WorkoutHistory({
  logs, exercises, workoutPhotos, onGoToProgress, onAddPast, onEditLog, onDeleteLog, onUploadPhoto, onDeletePhoto,
}: WorkoutHistoryProps) {
  const lastWorkout = logs[0];
  return (
    <>
      {/* Quick Resume Card of last Workout */}
      {lastWorkout && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-left">
            <div className="p-3 bg-blue-950/40 text-blue-400 rounded-2xl border border-blue-500/20">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Último Entrenamiento Registrado</div>
              <h4 className="font-bold text-slate-200 text-sm">{lastWorkout.routineName}</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(lastWorkout.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} • {Math.round(lastWorkout.duration / 60)} min
              </p>
            </div>
          </div>
          <button
            onClick={onGoToProgress}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
          >
            Ver en Gráficos <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Training History List log */}
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2">
        <History className="h-5 w-5 text-blue-400" />
        <h3 className="font-extrabold text-slate-200 text-base">Historial Reciente de Entrenamientos ({logs.length})</h3>
        <button
          type="button"
          onClick={onAddPast}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Registrar uno pasado
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {logs.map((log) => (
          <div
            key={log.id}
            id={`log-card-${log.id}`}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 relative overflow-hidden group"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-100 leading-snug">{log.routineName}</h4>
                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3 text-blue-400" />
                  {new Date(log.date).toLocaleString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onEditLog(log)}
                  className="text-slate-500 hover:text-blue-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Editar entrenamiento"
                  aria-label={`Editar ${log.routineName}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDeleteLog(log.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Eliminar del historial"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-950/50 p-3 rounded-xl text-center text-xs border border-slate-800/60">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Duración</span>
                <span className="font-bold text-slate-200">{Math.round(log.duration / 60)} min</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ejercicios</span>
                <span className="font-bold text-slate-200">{log.exercises.length}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Series Totales</span>
                <span className="font-bold text-slate-200">
                  {log.exercises.reduce((sum, item) => sum + item.sets.filter(s => s.completed).length, 0)}
                </span>
              </div>
            </div>

            {/* Exercises logged dropdown list */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
              {log.exercises.map((item) => {
                const ex = exercises.find((e) => e.id === item.exerciseId);
                const maxWeight = item.sets.length > 0 ? Math.max(...item.sets.map((s) => s.weight)) : 0;
                const totalReps = item.sets.reduce((sum, s) => sum + s.reps, 0);

                return (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-300 truncate max-w-[180px]">
                      {ex ? ex.name : 'Ejercicio'}
                    </span>
                    <span className="text-slate-400 font-medium">
                      {item.sets.length} series × {formatEsNumber(maxWeight)}kg • {formatReps(totalReps, ex)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Fotos del entrenamiento: se pueden añadir en cualquier momento */}
            <div className="pt-3 border-t border-slate-800/60">
              <WorkoutPhotos
                title={log.routineName}
                photos={workoutPhotos.filter((p) => p.logId === log.id)}
                onUpload={(file, onProgress) => onUploadPhoto(log.id, file, onProgress)}
                onDelete={onDeletePhoto}
              />
            </div>
          </div>
        ))}

        {logs.length === 0 && (
          <div className="col-span-full bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 p-12 text-center">
            <History className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Historial vacío</p>
            <p className="text-slate-500 text-xs mt-1">Tus entrenamientos completados se guardarán aquí.</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
