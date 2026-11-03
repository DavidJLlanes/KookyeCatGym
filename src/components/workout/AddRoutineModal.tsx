import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import type { Routine } from '../../types';

interface AddRoutineModalProps {
  open: boolean;
  routines: Routine[];
  onSelect: (routine: Routine) => void;
  onClose: () => void;
}

/** Lista de rutinas para combinar otra con la sesión en curso. */
export default function AddRoutineModal({ open, routines, onSelect, onClose }: AddRoutineModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-800 max-h-[85dvh] flex flex-col"
          >
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">Añadir rutina a esta sesión</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 space-y-2 bg-slate-950">
              <p className="text-xs text-slate-400 px-1 pb-1">
                Sus ejercicios se añaden al final, con los pesos de la última vez (o de tu regla de progresión).
              </p>
              {routines.map((routine) => (
                <button
                  key={routine.id}
                  type="button"
                  onClick={() => onSelect(routine)}
                  className="w-full text-left p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/50 transition-colors cursor-pointer"
                >
                  <div className="font-bold text-sm text-slate-100">{routine.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {[routine.folder, routine.dayOfWeek, `${routine.exercises.length} ejercicios`].filter(Boolean).join(' · ')}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
