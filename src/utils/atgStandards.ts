import type { WorkoutLog } from '../types';
import type { BodyWeightEntry } from './userData';
import { localDayKey } from './userData';
import { weightOnOrBefore } from './bodyWeight';

// Estándares ATG (Ben Patrick) expresados en % del peso corporal. Fuente:
// la compilación de a1athlete.com, que los toma de Ben Patrick y de su programa
// «Standards»; no es una lista oficial. Solo se incluyen los que se pueden
// emparejar sin dudas con un ejercicio de la biblioteca.

export interface AtgStandard {
  id: string;
  label: string;
  /** Ejercicios de la biblioteca que cuentan para este estándar. */
  exerciseIds: string[];
  /** Carga objetivo en % del peso corporal (por mancuerna si es con mancuernas). */
  percent: number;
  reps: number;
  note?: string;
}

export const ATG_STANDARDS: AtgStandard[] = [
  { id: 'rdl', label: 'Peso muerto rumano con barra', exerciseIds: ['0085'], percent: 100, reps: 10 },
  { id: 'incline-db', label: 'Press inclinado con mancuernas', exerciseIds: ['0316', '0314'], percent: 33, reps: 10, note: '66 % del peso en total: 33 % en cada mancuerna' },
  { id: 'calf-sl', label: 'Elevación de gemelo a una pierna con mancuerna', exerciseIds: ['0409'], percent: 25, reps: 10 },
];

export interface AtgProgress {
  standard: AtgStandard;
  /** Peso objetivo en kg con tu peso corporal actual. */
  targetKg: number;
  /** Mejor carga con las repeticiones pedidas (o más), en kg; 0 si no hay. */
  bestKg: number;
  /** 0-1+ (1 = estándar cumplido). */
  progress: number;
}

/** Cuánto te falta para cada estándar con tu peso actual. Devuelve [] si no hay pesajes. */
export function atgProgress(logs: WorkoutLog[], entries: BodyWeightEntry[]): AtgProgress[] {
  const bodyKg = weightOnOrBefore(entries, localDayKey());
  if (!bodyKg) return [];
  return ATG_STANDARDS.map((standard) => {
    let bestKg = 0;
    for (const log of logs) {
      for (const we of log.exercises) {
        if (!standard.exerciseIds.includes(we.exerciseId)) continue;
        for (const s of we.sets) {
          if (s.completed && !s.isWarmup && s.reps >= standard.reps && s.weight > bestKg) bestKg = s.weight;
        }
      }
    }
    const targetKg = Math.round(((bodyKg * standard.percent) / 100) * 2) / 2; // al 0,5 kg más cercano
    return { standard, targetKg, bestKg, progress: targetKg > 0 ? bestKg / targetKg : 0 };
  });
}
