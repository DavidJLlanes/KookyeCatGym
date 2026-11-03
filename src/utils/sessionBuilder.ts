import type { Exercise, WorkoutLog } from '../types';
import { bodyPartsOf } from './muscleStats';
import { canDoWithEquipment } from './equipment';
import type { MyEquipment } from './userData';

// Crea una sesión a partir de los músculos que el usuario toca en el mapa.

export interface SessionPickOptions {
  parts: string[];
  exercises: Exercise[];
  logs: WorkoutLog[];
  favorites: string[];
  equipment: MyEquipment;
  /** Ejercicios por músculo elegido (por defecto 2). */
  perPart?: number;
  /** Para tests: devuelve un número en [0, 1). */
  random?: () => number;
}

/**
 * Para cada músculo elige ejercicios que lo trabajen como principal con el
 * equipamiento que tienes. Priorizan los favoritos y los que ya has hecho; el
 * resto se reparte al azar. Un ejercicio no se repite aunque sirva a varios músculos.
 */
export function pickSessionExercises({ parts, exercises, logs, favorites, equipment, perPart = 2, random = Math.random }: SessionPickOptions): Exercise[] {
  const done = new Set(logs.flatMap((l) => l.exercises.map((e) => e.exerciseId)));
  const fav = new Set(favorites);
  const taken = new Set<string>();
  const result: Exercise[] = [];

  for (const part of parts) {
    const candidates = exercises
      .filter((ex) => !taken.has(ex.id) && canDoWithEquipment(ex, equipment) && bodyPartsOf(ex).primary.includes(part))
      .map((ex) => ({ ex, score: (fav.has(ex.id) ? 2 : 0) + (done.has(ex.id) ? 1 : 0) + random() * 0.99 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, perPart);
    for (const { ex } of candidates) {
      taken.add(ex.id);
      result.push(ex);
    }
  }
  return result;
}
