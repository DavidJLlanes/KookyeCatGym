import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Clock, Pause, Play, X } from 'lucide-react';
import type { RestTimer } from '../../hooks/useRestTimer';
import { formatClock } from '../../utils/clock';

/** Aviso de descanso: fijo bajo los botones de la cabecera, no se mueve con el scroll. */
export default function RestTimerBar({ timer }: { timer: RestTimer }) {
  const left = timer.secondsLeft;
  const finished = left === 0;
  const adjustClass = 'px-1.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer';

  return (
    <AnimatePresence>
      {left !== null && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto', transition: { type: 'spring', damping: 28, stiffness: 300 } }}
          exit={{ opacity: 0, height: 0, transition: { duration: 0.15, ease: 'easeIn' } }}
          className="overflow-hidden"
        >
          <div
            className={`rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 border shadow-md transition-colors ${
              finished ? 'bg-rose-600 border-rose-700 text-white animate-bounce' : 'bg-blue-950 border-blue-900 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-1.5 rounded-lg shrink-0 ${finished ? 'bg-white text-rose-600' : 'bg-blue-900/60'}`}>
                <Clock className={`h-5 w-5 ${left > 0 && !timer.paused ? 'animate-spin text-blue-400' : ''}`} />
              </div>
              <div className={`text-xs uppercase font-extrabold tracking-wider truncate ${finished ? 'text-rose-100' : 'text-blue-300'}`}>
                {finished ? '¡DESCANSO COMPLETADO!' : `DESCANSO • ${timer.exerciseName}`}
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
              <span className="font-mono text-2xl font-black min-w-[68px] text-center text-blue-400">{formatClock(left)}</span>

              {left > 0 && (
                <div className="flex gap-1">
                  <button type="button" onClick={() => timer.adjust(-15)} className={adjustClass}>
                    -15s
                  </button>
                  <button type="button" onClick={() => timer.adjust(15)} className={adjustClass}>
                    +15s
                  </button>
                  <button
                    type="button"
                    onClick={timer.togglePause}
                    aria-label={timer.paused ? 'Reanudar descanso' : 'Pausar descanso'}
                    className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {timer.paused ? <Play className="h-4 w-4 fill-white" /> : <Pause className="h-4 w-4" />}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={timer.dismiss}
                aria-label="Cerrar el descanso"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  finished ? 'bg-white/25 hover:bg-white/40 text-white' : 'hover:bg-white/15 text-blue-200 hover:text-white'
                }`}
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
