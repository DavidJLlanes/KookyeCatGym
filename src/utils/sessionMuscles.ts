import type { Exercise, Routine, WorkoutExercise } from '../types';
import { SECONDARY_WEIGHT, bodyPartsOf } from './muscleStats';

// Qué músculos (partes de la silueta) trabaja una sesión o una rutina y con
// cuántas series: los principales cuentan una serie entera y los secundarios,
// media. Se ignoran los calentamientos, igual que en el resto de estadísticas.

export type PartSets = Record<string, number>;

export interface SessionMuscles {
  /** Series previstas por parte (todas las de la sesión). */
  planned: PartSets;
  /** Series ya completadas por parte. */
  done: PartSets;
}

function add(target: PartSets, ex: Exercise, sets: number) {
  if (sets <= 0) return;
  const { primary, secondary } = bodyPartsOf(ex);
  for (const part of primary) target[part] = (target[part] ?? 0) + sets;
  // Un músculo que ya es principal no suma además como secundario
  for (const part of secondary) if (!primary.includes(part)) target[part] = (target[part] ?? 0) + sets * SECONDARY_WEIGHT;
}

/** Series previstas y hechas por parte en una lista de ejercicios (la sesión en curso, una rutina...). */
export function sessionMuscles(list: WorkoutExercise[], exercises: Exercise[]): SessionMuscles {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const planned: PartSets = {};
  const done: PartSets = {};
  for (const we of list) {
    const ex = byId.get(we.exerciseId);
    if (!ex) continue;
    const working = we.sets.filter((s) => !s.isWarmup);
    add(planned, ex, working.length);
    add(done, ex, working.filter((s) => s.completed).length);
  }
  return { planned, done };
}

/** Series por parte de una rutina. */
export const routineMuscles = (routine: Pick<Routine, 'exercises'>, exercises: Exercise[]): PartSets =>
  sessionMuscles(routine.exercises, exercises).planned;

/** Valor más alto de un reparto de series (para escalar el color). */
export const maxSets = (sets: PartSets): number => Math.max(0, ...Object.values(sets));

/** Partes que trabaja una lista de ejercicios, de más a menos series. */
export function rankedParts(sets: PartSets): [string, number][] {
  return Object.entries(sets)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
}
