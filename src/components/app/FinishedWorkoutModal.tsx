import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Share2, Sparkles, Trophy } from 'lucide-react';
import { Exercise, WorkoutLog } from '../../types';
import { formatEsNumber } from '../../utils/number';
import WorkoutShareModal from '../WorkoutShareModal';

interface FinishedWorkoutModalProps {
  /** Entrenamiento recién terminado; null = oculto. */
  log: WorkoutLog | null;
  exercises: Exercise[];
  /** Texto con los récords batidos (null si no hubo). */
  recordsMessage: string | null;
  onDismiss: () => void;
}

/** Celebración al terminar un entrenamiento, con resumen y opción de compartirlo. */
export default function FinishedWorkoutModal({ log, exercises, recordsMessage, onDismiss }: FinishedWorkoutModalProps) {
  const [workoutShareOpen, setWorkoutShareOpen] = useState(false);
  const dismiss = () => {
    setWorkoutShareOpen(false);
    onDismiss();
  };
  return (
    <>
  <AnimatePresence>
    {log && (
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="bg-slate-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-800 text-center relative p-8 space-y-6"
        >
          {/* Confetti Visual effect */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-600" />

          <div className="mx-auto h-20 w-20 bg-blue-950/40 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10 relative">
            <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-500 animate-bounce" />
            <Award className="h-10 w-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white tracking-tight">¡Entrenamiento Completado!</h3>
            <p className="text-sm text-slate-400 font-medium">
              Excelente esfuerzo. Tu constancia te acerca cada día más a tu mejor versión.
            </p>
          </div>

          {/* Aviso de récords batidos en esta sesión */}
          {recordsMessage && (
            <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-left">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-amber-400" />
              </div>
              <p className="text-sm font-bold text-amber-300 leading-snug">{recordsMessage}</p>
            </div>
          )}

          {/* Stats Summary box inside celebration */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 grid grid-cols-3 gap-3">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tiempo</span>
              <span className="font-extrabold text-slate-200 text-sm">
                {Math.round(log.duration / 60)} min
              </span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ejercicios</span>
              <span className="font-extrabold text-slate-200 text-sm">
                {log.exercises.length}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Carga Total</span>
              <span className="font-extrabold text-blue-400 text-sm">
                {formatEsNumber(log.exercises.reduce((sum, we) =>
                  sum + we.sets.reduce((setSum, s) => setSum + (s.completed ? s.weight * s.reps : 0), 0)
                , 0))} kg
              </span>
            </div>
          </div>

          {/* Exercises Summary quick bullets */}
          <div className="text-left space-y-1.5 pt-2 max-h-36 overflow-y-auto">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resumen de Series Completadas</div>
            {log.exercises.map((item) => {
              const ex = exercises.find((e) => e.id === item.exerciseId);
              const completedCount = item.sets.filter((s) => s.completed).length;
              return (
                <div key={item.id} className="flex justify-between text-xs text-slate-300 font-semibold border-b border-slate-800/60 pb-1">
                  <span>{ex ? ex.name : 'Ejercicio'}</span>
                  <span className="text-slate-400 font-bold">
                    {completedCount} {completedCount === 1 ? 'serie' : 'series'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => setWorkoutShareOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-sm font-bold transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
              Compartir entrenamiento
            </button>
            <button
              onClick={dismiss}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold transition-colors shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              Ver en mi Progreso
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>

  {/* Compartir el resumen del entrenamiento recién finalizado como imagen */}
  {log && (
    <WorkoutShareModal
      isOpen={workoutShareOpen}
      onClose={() => setWorkoutShareOpen(false)}
      log={log}
      exercises={exercises}
      hasRecord={!!recordsMessage}
    />
  )}
    </>
  );
}
