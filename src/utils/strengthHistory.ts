import type { Exercise, WorkoutLog } from '../types';
import { BodyWeightEntry, localDayKey } from './userData';
import { calculate1RM } from './oneRMEstimate';
import { isHold, setVolume } from './holdSets';
import { weightOnOrBefore } from './bodyWeight';

// Series temporales para las gráficas de fuerza: 1RM estimado en % del peso
// corporal por ejercicio, y total levantado acumulado.

export interface RelativePoint {
  date: string; // YYYY-MM-DD
  e1rm: number;
  bodyKg: number;
  /** 1RM ÷ peso corporal, en % (150 = levanta 1,5 veces su peso). */
  percent: number;
}

export interface RelativeExercise {
  exerciseId: string;
  name: string;
  points: RelativePoint[];
  /** Último valor registrado, para ordenar la lista. */
  latestPercent: number;
}

const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * Historial de cada ejercicio con carga: el mejor 1RM estimado de cada día
 * comparado con el peso corporal de ese día (o el primero registrado, si aún
 * no había pesajes). Ignora calentamientos, series sin carga y ejercicios por tiempo.
 */
export function relativeStrengthHistory(logs: WorkoutLog[], exercises: Exercise[], entries: BodyWeightEntry[]): RelativeExercise[] {
  if (entries.length === 0) return [];
  const byId = new Map(exercises.map((e) => [e.id, e]));
  // ejercicio → día → mejor 1RM de ese día
  const perExercise = new Map<string, Map<string, number>>();

  for (const log of logs) {
    const day = localDayKey(new Date(log.date));
    for (const we of log.exercises) {
      const ex = byId.get(we.exerciseId);
      if (!ex || isHold(ex)) continue;
      for (const s of we.sets) {
        if (!s.completed || s.isWarmup || s.weight <= 0 || s.reps <= 0) continue;
        const e1rm = calculate1RM(s.weight, s.reps);
        const days = perExercise.get(we.exerciseId) ?? new Map<string, number>();
        if (e1rm > (days.get(day) ?? 0)) days.set(day, e1rm);
        perExercise.set(we.exerciseId, days);
      }
    }
  }

  const result: RelativeExercise[] = [];
  for (const [exerciseId, days] of perExercise) {
    const points = [...days.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, e1rm]) => {
        const bodyKg = weightOnOrBefore(entries, date) ?? entries[0].kg;
        return { date, e1rm: round(e1rm, 1), bodyKg, percent: round((e1rm / bodyKg) * 100) };
      });
    result.push({ exerciseId, name: byId.get(exerciseId)!.name, points, latestPercent: points[points.length - 1].percent });
  }
  return result.sort((a, b) => b.latestPercent - a.latestPercent);
}

export interface TotalPoint {
  date: string;
  /** Kg levantados ese día. */
  day: number;
  /** Suma acumulada hasta ese día. */
  total: number;
}

/** Total levantado acumulado (kg × repeticiones de series de trabajo completadas), día a día. */
export function cumulativeLifted(logs: WorkoutLog[], exercises: Exercise[]): TotalPoint[] {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const perDay = new Map<string, number>();
  for (const log of logs) {
    const day = localDayKey(new Date(log.date));
    let sum = 0;
    for (const we of log.exercises) {
      const ex = byId.get(we.exerciseId);
      for (const s of we.sets) if (s.completed && !s.isWarmup) sum += setVolume(s.weight, s.reps, ex);
    }
    if (sum > 0) perDay.set(day, (perDay.get(day) ?? 0) + sum);
  }
  let running = 0;
  return [...perDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, day]) => {
      running += day;
      return { date, day: Math.round(day), total: Math.round(running) };
    });
}
