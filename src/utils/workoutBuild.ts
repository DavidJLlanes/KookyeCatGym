import type { Exercise, Routine, WorkoutExercise, WorkoutLog, WorkoutSet } from '../types';
import { defaultReps, isHold, looksUnilateral } from './holdSets';
import { getLastPerformanceSets } from './lastPerformance';
import { ProgressionRule, prefillWithProgression } from './progressionRules';

// Construcción de ejercicios nuevos para el entrenamiento en curso, con los
// pesos de la última vez (o de la regla de progresión) ya puestos.

export interface PrefillContext {
  logs: WorkoutLog[];
  rules: ProgressionRule[];
  /** Pilas de pesas por ejercicio (máquinas con escalones reales). */
  stacks: Record<string, number[]>;
}

const prefill = (exerciseId: string, base: WorkoutSet[], ctx: PrefillContext) =>
  prefillWithProgression(
    base,
    getLastPerformanceSets(exerciseId, ctx.logs),
    ctx.rules.find((r) => r.exerciseId === exerciseId),
    ctx.stacks[exerciseId]
  );

/** Un ejercicio de la biblioteca con tres series vacías. */
export function buildFromExercise(ex: Exercise, ctx: PrefillContext, stamp: number = Date.now()): WorkoutExercise {
  const base: WorkoutSet[] = [1, 2, 3].map((n) => ({ id: `set-act-${stamp}-${n}`, weight: 0, reps: defaultReps(ex), completed: false }));
  return {
    id: `we-active-${stamp}`,
    exerciseId: ex.id,
    restTime: ex.defaultRestTime,
    ...(looksUnilateral(ex.name) && !isHold(ex) ? { perSide: true } : {}),
    sets: prefill(ex.id, base, ctx),
  };
}

/**
 * Todos los ejercicios de una rutina, listos para añadir a la sesión en curso.
 * Los pesos se rellenan con lo de la última vez (o la regla de progresión),
 * salvo en `exactIds`: esos ejercicios conservan los pesos de la rutina tal
 * cual (los programas calculan su carga).
 */
export function buildFromRoutine(routine: Routine, ctx: PrefillContext, stamp: number = Date.now(), exactIds: ReadonlySet<string> = new Set()): WorkoutExercise[] {
  return routine.exercises.map((re, i) => {
    const base: WorkoutSet[] = re.sets.map((s, j) => ({
      id: `set-act-${stamp}-${i}-${j}`,
      weight: s.weight,
      reps: s.reps,
      completed: false,
      ...(s.isWarmup ? { isWarmup: true } : {}),
      ...(s.setType ? { setType: s.setType } : {}),
      ...(s.restTime !== undefined ? { restTime: s.restTime } : {}),
      ...(s.distance !== undefined ? { distance: s.distance } : {}),
    }));
    return {
      id: `we-active-${stamp}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      exerciseId: re.exerciseId,
      restTime: re.restTime,
      ...(re.supersetId ? { supersetId: `${re.supersetId}-${stamp}` } : {}),
      ...(re.alternativeIds && re.alternativeIds.length > 0 ? { alternativeIds: re.alternativeIds } : {}),
      ...(re.perSide ? { perSide: true } : {}),
      sets: exactIds.has(re.exerciseId) ? base : prefill(re.exerciseId, base, ctx),
    };
  });
}
