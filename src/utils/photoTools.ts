/**
 * Utilidades de las fotos de entrenamiento y de progreso físico.
 */
import type { MediaItem, ProgressMuscle } from '../api/client';

export const PROGRESS_MUSCLES: ProgressMuscle[] = ['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Abdomen', 'Piernas'];

// Color de cada grupo (los mismos tonos que usa la app para los músculos)
export const MUSCLE_COLOR: Record<ProgressMuscle, string> = {
  Pecho: '#3b82f6',
  Espalda: '#10b981',
  Hombros: '#f59e0b',
  Brazos: '#a855f7',
  Abdomen: '#ef4444',
  Piernas: '#06b6d4',
};

/** Clave de las fotos del entrenamiento en curso (aún no tiene id de historial). */
export const activeWorkoutPhotoKey = (startTime: string) => `active:${startTime}`;

/** Día AAAA-MM-DD en la hora local del dispositivo. */
export function localDay(date: Date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** "2026-10-07" -> Date local (sin desfase horario). */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }): string {
  return parseDay(day).toLocaleDateString('es-ES', opts);
}

/** "octubre de 2026" -> "Octubre de 2026" (solo la primera letra). */
export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);
}

export type MeasureUnit = 'cm' | 'mm';

/** 385 mm -> "38,5 cm" o "385 mm". */
export function formatMeasure(mm: number, unit: MeasureUnit = 'cm'): string {
  if (unit === 'mm') return `${mm} mm`;
  return `${(mm / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 })} cm`;
}

/** Texto del usuario ("38,5") en la unidad elegida -> milímetros, o null. */
export function parseMeasure(text: string, unit: MeasureUnit): number | null {
  const value = parseFloat(text.replace(',', '.'));
  if (!isFinite(value) || value <= 0) return null;
  const mm = Math.round(unit === 'cm' ? value * 10 : value);
  return mm >= 1 && mm <= 3000 ? mm : null;
}

/** Ordena por fecha de la foto y, dentro del mismo día, por subida. */
export function byTakenAt(a: MediaItem, b: MediaItem): number {
  return a.takenAt.localeCompare(b.takenAt) || a.createdAt.localeCompare(b.createdAt);
}

/**
 * Cómo medir cada grupo: perímetros con cinta según el protocolo de la ISAK
 * (Sociedad Internacional para el Avance de la Cineantropometría), el que usan
 * nutricionistas y preparadores. Espalda y hombros no tienen perímetro ISAK
 * propio: se usan las medidas habituales en culturismo, con el mismo rigor.
 */
export const MEASURE_GUIDE: Record<ProgressMuscle, { name: string; steps: string[] }> = {
  Pecho: {
    name: 'Perímetro de tórax (mesoesternal)',
    steps: [
      'De pie, brazos relajados a los lados y algo separados del cuerpo.',
      'Pasa la cinta horizontal alrededor del tórax a la altura de los pezones (punto medio del esternón).',
      'Por detrás, la cinta debe quedar a la misma altura, justo bajo las escápulas.',
      'Mide al final de una espiración normal, sin hinchar el pecho.',
    ],
  },
  Espalda: {
    name: 'Perímetro dorsal (máxima anchura de la espalda)',
    steps: [
      'De pie, brazos relajados a los lados y sin abrir los dorsales.',
      'Pasa la cinta horizontal justo por debajo de las axilas, por la parte más ancha de los dorsales.',
      'Comprueba en un espejo que la cinta va recta por delante y por detrás.',
      'Mide al final de una espiración normal.',
    ],
  },
  Hombros: {
    name: 'Perímetro de hombros (deltoides)',
    steps: [
      'De pie, brazos relajados a los lados y hombros sin encoger.',
      'Pasa la cinta horizontal por el punto de máxima protuberancia de los deltoides, rodeando ambos hombros.',
      'Mejor con ayuda de otra persona: tú solo es difícil mantener la cinta recta.',
      'Mide al final de una espiración normal.',
    ],
  },
  Brazos: {
    name: 'Perímetro de brazo flexionado y contraído (ISAK)',
    steps: [
      'Levanta el brazo hasta la altura del hombro, con el codo a unos 90°.',
      'Contrae el bíceps al máximo (puño cerrado hacia ti).',
      'Pasa la cinta perpendicular al brazo por el punto de mayor perímetro del bíceps.',
      'Mide siempre el mismo brazo (si no, anota cuál en las dos fotos).',
    ],
  },
  Abdomen: {
    name: 'Perímetro de cintura (ISAK)',
    steps: [
      'De pie, abdomen relajado, sin meter ni sacar tripa, brazos cruzados sobre el pecho.',
      'Pasa la cinta horizontal por el punto más estrecho entre la última costilla y la cresta ilíaca (el hueso de la cadera).',
      'Si no se ve un punto más estrecho, mide en el punto medio entre ambos.',
      'Mide al final de una espiración normal.',
    ],
  },
  Piernas: {
    name: 'Perímetro de muslo medio (ISAK)',
    steps: [
      'De pie, pies separados a la anchura de las caderas y el peso repartido en las dos piernas.',
      'Localiza el punto medio entre el pliegue de la ingle y el borde superior de la rótula.',
      'Pasa la cinta perpendicular al muslo por ese punto, sin apretar la piel.',
      'Mide siempre la misma pierna.',
    ],
  },
};

export const MEASURE_TIPS = [
  'Usa una cinta métrica flexible que no estire (de costura o antropométrica).',
  'Mide siempre en las mismas condiciones: por la mañana, en ayunas y antes de entrenar.',
  'La cinta debe ajustarse a la piel sin hundirla.',
  'Toma dos medidas seguidas y apunta la media; si difieren más de 5 mm, mide una tercera vez.',
];
