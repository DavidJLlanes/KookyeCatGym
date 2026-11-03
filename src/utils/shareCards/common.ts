import { Exercise } from '../../types';
import { getStaticThumbUrl } from '../media';

export function usableImageUrl(ex?: Exercise): string | null {
  const u = ex?.imageUrl;
  if (!u || u.includes('placeholder')) return null;
  if (!u.startsWith('http') && !u.startsWith('/')) return null;
  return getStaticThumbUrl(u);
}

// Generadores de las tarjetas compartibles (canvas). Cada tarjeta tiene dos
// versiones: 'compact' (la de siempre) y 'full' (más completa). Las usan tanto
// el flujo de fin de entrenamiento como la opción de compartir de Progreso.

export type ShareVariant = 'compact' | 'full';

export const W = 1080; // ancho fijo
export const M = 72; // margen lateral
export const USER_PHOTO_SRC = '/user-photo.webp';

export function formatDur(totalSeconds: number): string {
  const totalMin = Math.round(totalSeconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m} min`;
}

export interface Pill {
  text: string;
  w: number;
}

// Reparte "chips" (series) en filas que quepan en maxWidth, midiendo cada uno.
export function layoutPills(
  ctx: CanvasRenderingContext2D,
  tokens: string[],
  maxWidth: number,
  hpad: number,
  gap: number
): Pill[][] {
  const rows: Pill[][] = [];
  let row: Pill[] = [];
  let rowW = 0;
  for (const t of tokens) {
    const w = ctx.measureText(t).width + hpad * 2;
    const need = row.length ? w + gap : w;
    if (rowW + need > maxWidth && row.length) {
      rows.push(row);
      row = [];
      rowW = 0;
    }
    row.push({ text: t, w });
    rowW += row.length === 1 ? w : w + gap;
  }
  if (row.length) rows.push(row);
  return rows;
}

