import React from 'react';
import { Heart } from 'lucide-react';
import BODY_PATHS, { BodyView } from '../data/bodyPaths';
import { MuscleZone, MUSCLE_ZONE_IMAGE, MUSCLE_ZONE_LABEL } from '../utils/muscleZone';
import { ZONE_TO_BODY } from '../utils/muscleStats';

// Mismos colores que el mapa muscular (MuscleMapVisual).
const ACCENT = '#3b82f6';
const MUSCLE_BASE = '#243044';
const SILHOUETTE = '#334155';
const SEAM = '#0f172a';
const INERT = ['head', 'hair', 'neck', 'hands', 'feet', 'knees', 'ankles'];

// Qué cara de la silueta enseña cada zona nueva (las 18 originales usan su .webp).
const ZONE_VIEW: Partial<Record<MuscleZone, 'front' | 'back' | 'both'>> = {
  trapezius: 'back',
  serratus: 'front',
  adductors: 'front',
  abductors: 'back',
  neck: 'front',
  'full-body': 'both',
};

function Silhouette({ view, lit, label }: { view: BodyView; lit: Set<string>; label: string }) {
  const parts = Object.keys(view.p);
  const fill = (part: string) => (lit.has(part) ? ACCENT : INERT.includes(part) ? SILHOUETTE : MUSCLE_BASE);
  const draw = (part: string) =>
    view.p[part].map((d, i) => (
      <path key={part + i} d={d} fill={fill(part)} stroke={SEAM} strokeWidth={2.5} strokeLinejoin="round" />
    ));
  return (
    <svg viewBox={view.vb} className="h-full w-full" role="img" aria-label={label}>
      {parts.filter((p) => INERT.includes(p)).map(draw)}
      {parts.filter((p) => !INERT.includes(p)).map(draw)}
    </svg>
  );
}

/**
 * Imagen de una zona muscular: el .webp de siempre para las 18 zonas
 * originales y, para las zonas nuevas del catálogo importado, la silueta con
 * esa zona iluminada (así no hace falta una imagen por cada zona nueva).
 */
export default function MuscleZoneImage({ zone, className = '' }: { zone: MuscleZone; className?: string }) {
  const label = MUSCLE_ZONE_LABEL[zone];
  const src = MUSCLE_ZONE_IMAGE[zone];

  if (src) {
    return <img src={src} alt={label} loading="lazy" decoding="async" className={className} />;
  }

  if (zone === 'cardio') {
    return (
      <div className={`flex items-center justify-center ${className}`} role="img" aria-label={label}>
        <Heart className="h-1/2 w-1/2 text-rose-400" />
      </div>
    );
  }

  const view = ZONE_VIEW[zone] ?? 'front';
  const lit = new Set<string>(
    zone === 'full-body'
      ? [...Object.keys(BODY_PATHS.front.p), ...Object.keys(BODY_PATHS.back.p)].filter((p) => !INERT.includes(p))
      : ZONE_TO_BODY[zone]
  );

  return (
    <div className={`flex items-center justify-center gap-1 p-1 ${className}`}>
      {(view === 'front' || view === 'both') && <Silhouette view={BODY_PATHS.front} lit={lit} label={label} />}
      {(view === 'back' || view === 'both') && <Silhouette view={BODY_PATHS.back} lit={lit} label={label} />}
    </div>
  );
}
