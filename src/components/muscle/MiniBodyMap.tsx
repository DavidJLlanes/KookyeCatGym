import React from 'react';
import BODY_PATHS from '../../data/bodyPaths';
import { BODY_PART_LABEL } from '../../utils/muscleStats';
import { maxSets, rankedParts, type PartSets } from '../../utils/sessionMuscles';
import { BodySide } from './BodyFigure';

interface MiniBodyMapProps {
  /** Series por parte de la silueta. */
  sets: PartSets;
  /** Alto del dibujo en px (frente y espalda van juntos). */
  height?: number;
  className?: string;
}

/** Mapa pequeño de solo lectura: qué músculos trabaja una sesión, de un vistazo. */
export default function MiniBodyMap({ sets, height = 56, className = '' }: MiniBodyMapProps) {
  const max = maxSets(sets);
  if (max === 0) return null;
  const top = rankedParts(sets)
    .slice(0, 3)
    .map(([part]) => BODY_PART_LABEL[part] ?? part)
    .join(', ');
  return (
    <span className={`inline-flex items-center gap-0.5 shrink-0 ${className}`} style={{ height }} role="img" aria-label={`Músculos que trabaja: ${top}`} title={top}>
      <BodySide view={BODY_PATHS.front} load={sets} max={max} interactive={false} className="h-full w-auto" />
      <BodySide view={BODY_PATHS.back} load={sets} max={max} interactive={false} className="h-full w-auto" />
    </span>
  );
}
