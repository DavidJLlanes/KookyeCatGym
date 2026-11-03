import React, { useState} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles} from 'lucide-react';
import { Exercise} from '../../types';
import { MUSCLE_GROUPS, EQUIPMENT_TYPES} from '../../data/exerciseMeta';
import type { } from '../../api/client';

interface CreateExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (exercise: Exercise) => void;
}

/** Formulario para crear un ejercicio personalizado. */
export default function CreateExerciseModal({ isOpen, onClose, onCreate }: CreateExerciseModalProps) {
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState<Exercise['muscleGroup']>('Pecho');
  const [newEquipment, setNewEquipment] = useState<Exercise['equipment']>('Mancuernas');
  const [newRest, setNewRest] = useState(90);
  const [newInstructions, setNewInstructions] = useState('');

  const handleCreateCustomExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    // Use a clean Unsplash placeholder based on the muscle group
    let placeholderUrl = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80';
    if (newMuscle === 'Pecho') {
      placeholderUrl = 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&auto=format&fit=crop&q=80';
    } else if (newMuscle === 'Piernas') {
      placeholderUrl = 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=80';
    } else if (newMuscle === 'Espalda') {
      placeholderUrl = 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&auto=format&fit=crop&q=80';
    }

    const customEx: Exercise = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: newName,
      muscleGroup: newMuscle,
      equipment: newEquipment,
      imageUrl: placeholderUrl,
      defaultRestTime: newRest,
      instructions: newInstructions
        ? newInstructions.split('\n').filter(line => line.trim().length > 0)
        : ['Comienza en una posición estable y ejecuta el movimiento controlando la fase excéntrica.'],
      isCustom: true,
    };

    onCreate(customEx);
    
    // Reset form
    setNewName('');
    setNewMuscle('Pecho');
    setNewEquipment('Mancuernas');
    setNewRest(90);
    setNewInstructions('');
  };

  return (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-800 max-h-[90dvh] flex flex-col"
        >
          <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-400" />
              Nuevo Ejercicio Personalizado
            </h3>
            <button
              onClick={() => onClose()}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleCreateCustomExercise} className="overflow-y-auto flex-grow p-6 space-y-4 bg-slate-900">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Nombre del Ejercicio</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej. Flexiones Diamante, Curl de Bíceps Inclinado..."
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Grupo Muscular</label>
                <select
                  value={newMuscle}
                  onChange={(e) => setNewMuscle(e.target.value as Exercise['muscleGroup'])}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm cursor-pointer"
                >
                  {MUSCLE_GROUPS.map((mg) => (
                    <option key={mg} value={mg} className="bg-slate-950 text-slate-100">{mg}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Equipamiento</label>
                <select
                  value={newEquipment}
                  onChange={(e) => setNewEquipment(e.target.value as Exercise['equipment'])}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm cursor-pointer"
                >
                  {EQUIPMENT_TYPES.map((eq) => (
                    <option key={eq} value={eq} className="bg-slate-950 text-slate-100">{eq}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Tiempo de Descanso por Defecto (segundos)
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="number"
                  required
                  min={10}
                  max={600}
                  value={newRest}
                  onChange={(e) => setNewRest(parseInt(e.target.value) || 90)}
                  className="w-32 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                />
                <span className="text-xs text-slate-500">
                  Equivale a {Math.floor(newRest / 60)}m y {newRest % 60}s. Se iniciará al completar una serie.
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Instrucciones (Una por línea)
              </label>
              <textarea
                rows={4}
                value={newInstructions}
                onChange={(e) => setNewInstructions(e.target.value)}
                placeholder="Paso 1: Colócate en posición...&#10;Paso 2: Baja el peso de forma controlada...&#10;Paso 3: Realiza un empuje explosivo..."
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm placeholder-slate-600 leading-relaxed"
              />
            </div>
          </form>

          <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onClose()}
              className="px-4 py-2.5 text-slate-400 hover:bg-slate-800 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateCustomExercise}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
            >
              Crear Ejercicio
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );
}
