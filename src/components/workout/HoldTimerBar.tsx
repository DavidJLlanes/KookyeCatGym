import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FastForward, Square, Timer, X } from 'lucide-react';
import type { HoldTimer } from '../../hooks/useHoldTimer';
import { formatClock } from '../../utils/clock';

/** Cronómetro de una serie por tiempo: «Prepárate» y después «Aguanta», con barra de progreso. */
export default function HoldTimerBar({ timer }: { timer: HoldTimer }) {
  const run = timer.run;
  const ready = timer.phase === 'ready';
  const progress = run && !ready ? Math.min(1, Math.max(0, 1 - timer.secondsLeft / run.targetSeconds)) : 0;

  return (
    <AnimatePresence>
      {run && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto', transition: { type: 'spring', damping: 28, stiffness: 300 } }}
          exit={{ opacity: 0, height: 0, transition: { duration: 0.15, ease: 'easeIn' } }}
          className="overflow-hidden"
          role="timer"
          aria-live="off"
        >
          <div className={`rounded-xl p-3 border shadow-md ${ready ? 'bg-amber-950 border-amber-800' : 'bg-emerald-950 border-emerald-800'} text-white`}>
            <div className={`flex items-center gap-2.5 min-w-0 text-xs uppercase font-extrabold tracking-wider ${ready ? 'text-amber-200' : 'text-emerald-200'}`}>
              <Timer className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {ready ? 'Prepárate' : 'Aguanta'} • {run.exerciseName}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className={`font-mono text-4xl font-black ${ready ? 'text-amber-300' : 'text-emerald-300'}`}>{formatClock(timer.secondsLeft)}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={timer.advance}
                  className="flex items-center gap-1 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold cursor-pointer"
                >
                  {ready ? <FastForward className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  {ready ? 'Ya' : 'Terminar'}
                </button>
                <button type="button" onClick={timer.cancel} aria-label="Cancelar el cronómetro" className="p-2 hover:bg-white/15 rounded-lg cursor-pointer">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
            {!ready && (
              <div className="mt-2.5 h-1.5 rounded-full bg-emerald-900 overflow-hidden">
                <div className="h-full bg-emerald-400 transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
