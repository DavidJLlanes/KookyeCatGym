import type { Exercise, WorkoutLog } from '../types';
import { BodyGoal, BodyWeightEntry, localDayKey } from './userData';
import { calculate1RM } from './oneRMEstimate';
import { isHold, setVolume } from './holdSets';

const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD → ms a mediodía local (evita saltos por cambios de hora). */
function dayToMs(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
}

export const daysBetweenKeys = (a: string, b: string): number => Math.round((dayToMs(b) - dayToMs(a)) / DAY_MS);

export function upsertWeight(entries: BodyWeightEntry[], date: string, kg: number): BodyWeightEntry[] {
  const rest = entries.filter((e) => e.date !== date);
  return [...rest, { date, kg }].sort((a, b) => a.date.localeCompare(b.date));
}

export function removeWeight(entries: BodyWeightEntry[], date: string): BodyWeightEntry[] {
  return entries.filter((e) => e.date !== date);
}

/**
 * Ritmo semanal (kg/semana, negativo = bajando): pendiente de la recta de
 * mínimos cuadrados sobre los pesajes de las últimas `windowDays`. Una recta
 * (y no "último menos primero") aguanta que un día pese 1 kg más por agua.
 * Devuelve null si hay pocos datos: al menos 3 pesajes que abarquen 7 días.
 */
export function weeklyRateKg(entries: BodyWeightEntry[], today: string = localDayKey(), windowDays = 28): number | null {
  const inWindow = entries.filter((e) => {
    const age = daysBetweenKeys(e.date, today);
    return age >= 0 && age < windowDays;
  });
  if (inWindow.length < 3) return null;
  const xs = inWindow.map((e) => daysBetweenKeys(inWindow[0].date, e.date));
  if (xs[xs.length - 1] - xs[0] < 7) return null;
  const n = inWindow.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = inWindow.reduce((s, e) => s + e.kg, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (inWindow[i].kg - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  return Math.round((num / den) * 7 * 100) / 100;
}

export interface GoalStatus {
  currentKg: number;
  currentDate: string;
  /** Lo que falta para el objetivo (con signo: negativo = hay que bajar). */
  remainingKg: number;
  /** El peso actual ya cumple el objetivo (según el modo). */
  reached: boolean;
  /** El ritmo actual lleva hacia el objetivo (o, en 'hold', no se aleja). */
  movingRight: boolean | null;
  rateKgPerWeek: number | null;
  /** Semanas hasta el objetivo al ritmo actual (null si no se alcanzará o no hay ritmo). */
  weeksToGo: number | null;
  /** Comparación con el ritmo planificado, si lo hay. */
  vsPlan: 'faster' | 'onPlan' | 'slower' | null;
}

export function goalStatus(entries: BodyWeightEntry[], goal: BodyGoal, today: string = localDayKey()): GoalStatus | null {
  if (entries.length === 0) return null;
  const latest = entries[entries.length - 1];
  const rate = weeklyRateKg(entries, today);
  const remaining = Math.round((goal.targetKg - latest.kg) * 10) / 10;
  const tol = goal.toleranceKg ?? 0.5;

  let reached = false;
  if (goal.mode === 'lose') reached = latest.kg <= goal.targetKg;
  else if (goal.mode === 'gain') reached = latest.kg >= goal.targetKg;
  else reached = Math.abs(remaining) <= tol;

  let movingRight: boolean | null = null;
  if (rate !== null) {
    if (goal.mode === 'lose') movingRight = rate < -0.05;
    else if (goal.mode === 'gain') movingRight = rate > 0.05;
    else movingRight = Math.abs(rate) <= 0.15 || Math.sign(rate) === Math.sign(remaining);
  }

  let weeksToGo: number | null = null;
  if (!reached && rate !== null && rate !== 0 && Math.sign(rate) === Math.sign(remaining)) {
    weeksToGo = Math.round((Math.abs(remaining) / Math.abs(rate)) * 10) / 10;
  }

  let vsPlan: GoalStatus['vsPlan'] = null;
  if (goal.plannedRateKg && rate !== null && goal.mode !== 'hold') {
    const actual = Math.abs(rate);
    if (actual > goal.plannedRateKg * 1.25) vsPlan = 'faster';
    else if (actual < goal.plannedRateKg * 0.75) vsPlan = 'slower';
    else vsPlan = 'onPlan';
  }

  return { currentKg: latest.kg, currentDate: latest.date, remainingKg: remaining, reached, movingRight, rateKgPerWeek: rate, weeksToGo, vsPlan };
}

/** Peso corporal vigente en una fecha: el último pesaje de ese día o anterior. */
export function weightOnOrBefore(entries: BodyWeightEntry[], day: string): number | null {
  let found: number | null = null;
  for (const e of entries) {
    if (e.date <= day) found = e.kg;
    else break;
  }
  return found;
}

export interface RelativeLift {
  exerciseId: string;
  name: string;
  /** Mejor 1RM estimado (kg). */
  e1rm: number;
  /** Peso corporal de ese día (o el más cercano si no hay pesaje anterior). */
  bodyKg: number;
  /** 1RM ÷ peso corporal (1,5 = levanta 1,5 veces su peso). */
  ratio: number;
  date: string;
}

/**
 * Mejor 1RM de cada ejercicio como múltiplo del peso corporal. Se comparan
 * con el peso del día en que se hizo la serie; si aún no había pesajes, con
 * el primero registrado. Ignora calentamientos, series sin carga y ejercicios
 * por tiempo.
 */
export function liftsRelativeToBodyWeight(logs: WorkoutLog[], exercises: Exercise[], entries: BodyWeightEntry[]): RelativeLift[] {
  if (entries.length === 0) return [];
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const best = new Map<string, RelativeLift>();

  for (const log of logs) {
    const day = localDayKey(new Date(log.date));
    const bodyKg = weightOnOrBefore(entries, day) ?? entries[0].kg;
    for (const we of log.exercises) {
      const ex = byId.get(we.exerciseId);
      if (!ex || isHold(ex)) continue;
      for (const s of we.sets) {
        if (!s.completed || s.isWarmup || s.weight <= 0 || s.reps <= 0) continue;
        const e1rm = calculate1RM(s.weight, s.reps);
        const ratio = e1rm / bodyKg;
        const prev = best.get(we.exerciseId);
        if (!prev || ratio > prev.ratio) {
          best.set(we.exerciseId, { exerciseId: we.exerciseId, name: ex.name, e1rm, bodyKg, ratio: Math.round(ratio * 100) / 100, date: day });
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => b.ratio - a.ratio);
}

/** Todo lo que has levantado: suma de kg × repeticiones de las series de trabajo completadas. */
export function totalLiftedKg(logs: WorkoutLog[], exercises: Exercise[]): number {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  let total = 0;
  for (const log of logs) {
    for (const we of log.exercises) {
      const ex = byId.get(we.exerciseId);
      for (const s of we.sets) {
        if (s.completed && !s.isWarmup) total += setVolume(s.weight, s.reps, ex);
      }
    }
  }
  return Math.round(total);
}
