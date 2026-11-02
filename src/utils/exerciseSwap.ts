import type { WorkoutExercise, WorkoutSet } from '../types';

export const MAX_ALTERNATIVES = 4;

/** Alternativas válidas de un ejercicio de la rutina: sin repetidos, sin él mismo. */
export function cleanAlternatives(exerciseId: string, ids: string[] | undefined): string[] {
  return [...new Set(ids ?? [])].filter((id) => id !== exerciseId).slice(0, MAX_ALTERNATIVES);
}

/**
 * Cambia el ejercicio de un hueco de la sesión por una de sus alternativas,
 * conservando el hueco: mismas series (con su tipo y su descanso), mismas
 * repeticiones, misma superserie y mismo orden. Los pesos NO se arrastran
 * (otra máquina, otra carga): se toman de la última vez que se hizo el nuevo
 * ejercicio o quedan en 0. El ejercicio que se deja pasa a ser una alternativa,
 * para poder volver con otro toque.
 */
export function swapForAlternative(
  we: WorkoutExercise,
  newExerciseId: string,
  newExerciseDefaultRest: number,
  lastSetsOfNew: WorkoutSet[] | null
): WorkoutExercise {
  const working = (lastSetsOfNew ?? []).filter((s) => !s.isWarmup);
  const alternatives = cleanAlternatives(newExerciseId, [we.exerciseId, ...(we.alternativeIds ?? [])]);
  let workingIndex = 0;
  return {
    ...we,
    exerciseId: newExerciseId,
    restTime: we.restTime ?? newExerciseDefaultRest,
    alternativeIds: alternatives,
    sets: we.sets.map((s) => {
      let weight = 0;
      if (!s.isWarmup && working.length > 0) {
        weight = working[Math.min(workingIndex, working.length - 1)].weight;
        workingIndex += 1;
      }
      return { ...s, weight, completed: false };
    }),
  };
}
