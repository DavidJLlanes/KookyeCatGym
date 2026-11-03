import React from 'react';
import { assetUrl } from '../../utils/assetUrl';
import { MuscleZone, MUSCLE_ZONE_IMAGE, MUSCLE_ZONE_LABEL } from '../../utils/muscleZone';

/** Imagen anatómica de una zona muscular (public/muscle-anatomy/<zona>.webp). */
export default function MuscleZoneImage({ zone, className = '' }: { zone: MuscleZone; className?: string }) {
  return <img src={assetUrl(MUSCLE_ZONE_IMAGE[zone])} alt={MUSCLE_ZONE_LABEL[zone]} loading="lazy" decoding="async" className={className} />;
}
