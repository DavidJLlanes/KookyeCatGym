import type { Exercise } from '../types';

// Ejercicios "por tiempo": isométricos de mantener (planchas, estiramientos,
// posturas...) y cardio (correr, bici, elíptica...). Su serie guarda el TIEMPO
// en segundos en el campo `reps`, para que todo lo demás (récords de "más
// repeticiones" = más tiempo, copiar la última serie, historial...) funcione
// sin migrar datos. Estas utilidades solo cambian la etiqueta y los valores por
// defecto, y evitan multiplicar peso × segundos. El cardio, además, puede
// guardar la distancia (km) de la serie y de ahí sale la velocidad.

type MaybeHold = Pick<Exercise, 'hold' | 'muscleGroup'> | null | undefined;

/** Ejercicio de cardio: su grupo es "Cardio". */
export const isCardio = (ex: MaybeHold): boolean => ex?.muscleGroup === 'Cardio';

/** Ejercicio medido en tiempo: de mantener o de cardio. */
export const isHold = (ex: MaybeHold): boolean => !!ex?.hold || isCardio(ex);

/** Cabecera de la columna de repeticiones. */
export const repsColumnLabel = (ex: MaybeHold, long = false, perSide = false): string => {
  if (isCardio(ex)) return 'Tiempo';
  if (isHold(ex)) return long ? 'Seg de ref' : 'Seg';
  const base = long ? 'Reps de Ref' : 'Reps';
  return perSide ? `${base}/lado` : base;
};

/** Valor inicial de una serie nueva: 20 min de cardio, 30 s si se mantiene, 10 repeticiones si no. */
export const defaultReps = (ex: MaybeHold): number => (isCardio(ex) ? 1200 : isHold(ex) ? 30 : 10);

/** Segundos como "45 s", "12:30" o "1:05:00". */
export function formatDuration(totalSeconds: number): string {
  const t = Math.max(0, Math.round(totalSeconds));
  if (t < 60) return `${t} s`;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Lo que escribe el usuario ("25", "25:30", "1:05:00") → segundos. Un número suelto son minutos. */
export function parseDuration(text: string): number {
  const t = text.trim().replace(',', '.');
  if (!t) return 0;
  const parts = t.split(':');
  if (parts.length === 1) {
    const minutes = parseFloat(parts[0]);
    return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60) : 0;
  }
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return 0;
  const nums = parts.map(Number);
  return Math.round(nums.length === 2 ? nums[0] * 60 + nums[1] : nums[0] * 3600 + nums[1] * 60 + nums[2]);
}

/** Velocidad media en km/h a partir de distancia (km) y tiempo (s); null si falta algo. */
export function speedKmh(distanceKm: number | undefined, seconds: number): number | null {
  if (!distanceKm || distanceKm <= 0 || seconds <= 0) return null;
  return Math.round((distanceKm / (seconds / 3600)) * 10) / 10;
}

/** Ritmo en min/km ("5:30") a partir de distancia y tiempo; null si falta algo. */
export function paceMinKm(distanceKm: number | undefined, seconds: number): string | null {
  if (!distanceKm || distanceKm <= 0 || seconds <= 0) return null;
  const perKm = seconds / distanceKm;
  const m = Math.floor(perKm / 60);
  const s = Math.round(perKm % 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

/** "30 s", "20:00" o "12 reps". */
export const formatReps = (n: number, ex: MaybeHold, perSide = false): string =>
  isHold(ex) ? formatDuration(n) : `${n} reps${perSide ? '/lado' : ''}`;

/** Volumen de una serie (kg × reps). En un ejercicio por tiempo no tiene sentido (kg × segundos). */
export const setVolume = (weight: number, reps: number, ex: MaybeHold): number => (isHold(ex) ? 0 : weight * reps);

/**
 * ¿Es un ejercicio que se hace de un lado y luego del otro? Se deduce del
 * nombre (a una pierna, a una mano, zancadas, búlgara...) y solo sirve para
 * proponer el interruptor «por lado»; el usuario siempre puede cambiarlo.
 */
export function looksUnilateral(name: string): boolean {
  return /\b(a una (pierna|mano|brazo)|una pierna|un brazo|una mano|unilateral|zancada|zancadas|b[uú]lgara|pistol|alterno|alternas|alternado|alternos)\b/i.test(name);
}
