import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import type { Exercise } from '../../types';
import ExerciseLibraryPanel from '../ExerciseLibraryPanel';

interface AddExerciseModalProps {
  open: boolean;
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

/** Biblioteca de ejercicios en una ventana, para añadir uno a la sesión en curso. */
export default function AddExerciseModal({ open, exercises, onSelect, onClose }: AddExerciseModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-900 rounded-2xl max-w-6xl w-full overflow-hidden shadow-2xl border border-slate-800 max-h-[85dvh] flex flex-col"
          >
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">Agregar Ejercicio al Entrenamiento</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 flex-grow bg-slate-950">
              <ExerciseLibraryPanel exercises={exercises} onAddCustomExercise={() => {}} selectable onSelectExercise={onSelect} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
