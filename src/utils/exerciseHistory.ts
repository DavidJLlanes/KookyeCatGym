import type { Exercise, WorkoutLog, WorkoutSet } from '../types';
import { calculate1RM } from './oneRMEstimate';
import { isHold } from './holdSets';

export interface ExerciseSession {
  logId: string;
  date: string; // ISO
  routineName: string;
  sets: WorkoutSet[]; // series hechas, sin calentamiento
  /** Mejor serie de la sesión: la de mayor 1RM estimado (o la más larga si es por tiempo). */
  best: WorkoutSet | null;
  /** 1RM estimado de la mejor serie (0 si no aplica). */
  bestE1rm: number;
  volume: number;
}

export interface ExerciseHistory {
  sessions: ExerciseSession[]; // más reciente primero
  bestE1rm: number;
  bestWeight: number;
  bestSetLogId: string | null;
  totalSets: number;
}

/** Todas las veces que se ha hecho un ejercicio, con su mejor serie y sus récords. */
export function getExerciseHistory(exerciseId: string, logs: WorkoutLog[], ex?: Pick<Exercise, 'hold' | 'muscleGroup'>): ExerciseHistory {
  const timed = isHold(ex);
  const sessions: ExerciseSession[] = [];
  let bestE1rm = 0;
  let bestWeight = 0;
  let bestSetLogId: string | null = null;
  let totalSets = 0;

  for (const log of logs) {
    const sets = log.exercises
      .filter((we) => we.exerciseId === exerciseId)
      .flatMap((we) => we.sets)
      .filter((s) => s.completed && !s.isWarmup);
    if (sets.length === 0) continue;

    let best: WorkoutSet | null = null;
    let sessionBest = 0;
    let volume = 0;
    for (const s of sets) {
      totalSets += 1;
      const score = timed ? s.reps : s.weight > 0 ? calculate1RM(s.weight, s.reps) : s.reps;
      if (!best || score > sessionBest) {
        best = s;
        sessionBest = score;
      }
      if (!timed) volume += s.weight * s.reps;
      if (!timed && s.weight > bestWeight) bestWeight = s.weight;
    }
    const e1rm = !timed && best && best.weight > 0 ? sessionBest : 0;
    if (e1rm > bestE1rm) {
      bestE1rm = e1rm;
      bestSetLogId = log.id;
    }
    sessions.push({ logId: log.id, date: log.date, routineName: log.routineName, sets, best, bestE1rm: e1rm, volume });
  }

  sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return { sessions, bestE1rm, bestWeight, bestSetLogId, totalSets };
}
