import React from 'react';
import type { BodyView } from '../../data/bodyPaths';
import { BODY_PART_GROUP, BODY_PART_LABEL } from '../../utils/muscleStats';
import { INERT_PARTS, LEVEL_FILL, SEAM, SILHOUETTE, levelOf } from './bodyPalette';

interface BodySideProps {
  view: BodyView;
  /** Valor de cada parte de la silueta (series, nivel...). */
  load: Record<string, number>;
  /** Valor que corresponde al color pleno. */
  max: number;
  fills?: string[];
  highlightGroup?: string | null;
  /** Partes a marcar con un contorno (p. ej. lo planeado en una sesión). */
  outline?: Record<string, number>;
  /** Si es false, el dibujo es solo decorativo: sin cursor ni eventos. */
  interactive?: boolean;
  className?: string;
  onHover?: (part: string | null) => void;
  onPick?: (part: string) => void;
}

/**
 * Silueta (frente o espalda) con los músculos coloreados por nivel. La usan el
 * mapa muscular, el mapa pequeño de cada sesión y las fotos de progreso.
 */
export function BodySide({
  view,
  load,
  max,
  fills = LEVEL_FILL,
  highlightGroup,
  outline,
  interactive = true,
  className = 'h-auto w-full max-h-[340px]',
  onHover,
  onPick,
}: BodySideProps) {
  const parts = Object.keys(view.p);
  return (
    <svg viewBox={view.vb} className={className} role={interactive ? 'group' : 'img'} aria-hidden={interactive ? undefined : true}>
      {parts.filter((p) => INERT_PARTS.includes(p)).map((part) =>
        view.p[part].map((d, i) => <path key={part + i} d={d} fill={SILHOUETTE} stroke={SEAM} strokeWidth={2.5} strokeLinejoin="round" />)
      )}
      {parts.filter((p) => !INERT_PARTS.includes(p)).map((part) => {
        const selected = !!highlightGroup && BODY_PART_GROUP[part] === highlightGroup;
        const planned = !!outline?.[part];
        return view.p[part].map((d, i) => (
          <path
            key={part + i}
            d={d}
            fill={fills[levelOf(load[part], max)]}
            stroke={selected ? '#e2e8f0' : planned ? '#93c5fd' : SEAM}
            strokeWidth={selected ? 6 : planned ? 5 : 2.5}
            strokeDasharray={planned && !selected ? '14 8' : undefined}
            strokeLinejoin="round"
            className={interactive ? 'cursor-pointer transition-[fill] duration-300' : undefined}
            onMouseEnter={interactive ? () => onHover?.(part) : undefined}
            onMouseLeave={interactive ? () => onHover?.(null) : undefined}
            onClick={interactive ? () => onPick?.(part) : undefined}
          >
            {interactive && <title>{BODY_PART_LABEL[part] ?? part}</title>}
          </path>
        ));
      })}
    </svg>
  );
}
