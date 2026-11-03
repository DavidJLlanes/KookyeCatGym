// Colores y niveles compartidos por todos los dibujos del cuerpo (mapa muscular,
// mapa pequeño, imagen de zona, fotos de progreso).

export const ACCENT = '#3b82f6';
export const MUSCLE_BASE = '#243044';
export const SILHOUETTE = '#334155';
export const SEAM = '#0f172a';

/** Partes que son silueta y no un músculo: no se colorean ni se pueden tocar. */
export const INERT_PARTS = ['head', 'hair', 'hands', 'feet', 'knees', 'ankles'];

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v * t + pb[i] * (1 - t)).toString(16).padStart(2, '0')).join('');
}

/** Cinco tonos, del músculo sin estímulo (nivel 0) al color pleno (nivel 4). */
const palette = (accent: string) => [MUSCLE_BASE, mix(accent, MUSCLE_BASE, 0.32), mix(accent, MUSCLE_BASE, 0.56), mix(accent, MUSCLE_BASE, 0.78), accent];

export const LEVEL_FILL = palette(ACCENT);
// Recuperación en ámbar (cuanto más intenso, más reciente) y sin entrenar en rojo.
export const RECOVERY_FILL = palette('#f59e0b');
export const UNTRAINED_FILL = palette('#ef4444');

/** Nivel 0-4 de un valor respecto al máximo. */
export function levelOf(value: number, max: number): number {
  if (!value || max <= 0) return 0;
  return Math.max(1, Math.ceil((value / max) * 4));
}
