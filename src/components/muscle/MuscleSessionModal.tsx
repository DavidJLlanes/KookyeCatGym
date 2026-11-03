import React, { useState } from 'react';
import { Play, X } from 'lucide-react';
import MuscleExplorer from './MuscleExplorer';

interface MuscleSessionModalProps {
  onClose: () => void;
  /** Recibe los músculos elegidos y crea la sesión. */
  onCreate: (parts: string[]) => void;
}

/** Crea un entrenamiento tocando en el mapa los músculos que quieres trabajar hoy. */
export default function MuscleSessionModal({ onClose, onCreate }: MuscleSessionModalProps) {
  const [parts, setParts] = useState<string[]>([]);
  const toggle = (part: string) => setParts((cur) => (cur.includes(part) ? cur.filter((p) => p !== part) : [...cur, part]));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-label="Sesión por músculos" className="w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-100">Sesión por músculos</h3>
            <p className="text-xs text-slate-400">Toca los músculos que quieres trabajar y te propongo ejercicios con tu equipamiento.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <MuscleExplorer selected={parts} onToggle={toggle} />
        <button
          type="button"
          disabled={parts.length === 0}
          onClick={() => onCreate(parts)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm cursor-pointer"
        >
          <Play className="h-4 w-4" /> Crear sesión
        </button>
      </div>
    </div>
  );
}
