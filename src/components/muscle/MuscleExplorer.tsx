import React from 'react';
import BODY_PATHS from '../../data/bodyPaths';
import { BODY_PART_LABEL } from '../../utils/muscleStats';
import { BodySide } from './BodyFigure';

interface MuscleExplorerProps {
  /** Partes de la silueta elegidas (p. ej. "chest"). */
  selected: string[];
  onToggle: (part: string) => void;
  hint?: string;
  /** Alto de cada figura (frente y espalda van juntas). */
  height?: number;
}

/**
 * Silueta táctil: se toca un músculo para elegirlo (y otra vez para quitarlo), uno o varios.
 * La usan la biblioteca (filtrar ejercicios) y el creador de sesiones.
 */
export default function MuscleExplorer({ selected, onToggle, hint = 'Toca un músculo para elegirlo', height = 220 }: MuscleExplorerProps) {
  const load = Object.fromEntries(selected.map((p) => [p, 1]));
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-2" style={{ height }}>
        <BodySide view={BODY_PATHS.front} load={load} max={1} onPick={onToggle} className="h-full w-auto" />
        <BodySide view={BODY_PATHS.back} load={load} max={1} onPick={onToggle} className="h-full w-auto" />
      </div>
      <p className="text-xs text-slate-400 min-h-[1rem]" aria-live="polite">
        {selected.length > 0 ? <>Elegido: <strong className="text-slate-200">{selected.map((p) => BODY_PART_LABEL[p] ?? p).join(', ')}</strong></> : hint}
      </p>
    </div>
  );
}
