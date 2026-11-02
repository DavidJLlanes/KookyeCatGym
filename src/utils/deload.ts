import type { WorkoutExercise, WorkoutSet } from '../types';
import { DeloadConfig, WeekStart } from './userData';
import { weekStartKey } from './weekPlan';
import { isHold } from './holdSets';
import { snapToStack } from './weightStack';

// Semanas de descarga planificadas: cada `everyWeeks` semanas (o las que marques a
// mano) se entrena con menos series y menos peso para recuperarse. Esa semana se
// anota como «descarga», y NO cuenta como «lo que hiciste la última vez» para
// prerrellenar ni para progresar: al volver a la normalidad se retoma la carga
// de antes de la descarga.

const daysBetween = (a: string, b: string): number => {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((new Date(by, bm - 1, bd, 12).getTime() - new Date(ay, am - 1, ad, 12).getTime()) / 86400000);
};

/** ¿La semana que contiene `date` es de descarga? */
export function isDeloadWeek(config: DeloadConfig, date: Date, weekStart: WeekStart): boolean {
  const week = weekStartKey(date, weekStart);
  if (config.manualWeeks.includes(week)) return true;
  if (!config.enabled || !config.startWeek) return false;
  const [y, m, d] = config.startWeek.split('-').map(Number);
  const cycleStart = weekStartKey(new Date(y, m - 1, d, 12), weekStart);
  const weeks = Math.floor(daysBetween(cycleStart, week) / 7);
  if (weeks < 0) return false;
  // La descarga cae en la última semana de cada ciclo (con 4: semanas 4, 8, 12...)
  return weeks % config.everyWeeks === config.everyWeeks - 1;
}

/** Cuántas semanas faltan para la próxima descarga (0 = esta semana lo es), o null si no hay plan. */
export function weeksUntilDeload(config: DeloadConfig, date: Date, weekStart: WeekStart): number | null {
  if (isDeloadWeek(config, date, weekStart)) return 0;
  if (!config.enabled || !config.startWeek) return null;
  for (let i = 1; i <= config.everyWeeks; i++) {
    if (isDeloadWeek(config, new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7 * i, 12), weekStart)) return i;
  }
  return null;
}

function roundWeight(w: number, stack?: number[]): number {
  if (w <= 0) return 0;
  if (stack && stack.length > 0) return snapToStack(w, stack);
  const step = w >= 20 ? 2.5 : 0.5;
  return Math.max(step, Math.round(w / step) * step);
}

/**
 * Versión de descarga de las series de un ejercicio: menos series de trabajo y
 * menos peso (los calentamientos se quedan). Los ejercicios por tiempo solo
 * reducen las series.
 */
export function applyDeloadToSets(sets: WorkoutSet[], config: Pick<DeloadConfig, 'loadPercent' | 'setsPercent'>, timed: boolean, stack?: number[]): WorkoutSet[] {
  const working = sets.filter((s) => !s.isWarmup);
  const keep = working.length <= 1 ? working.length : Math.max(2, Math.ceil((working.length * config.setsPercent) / 100));
  let seen = 0;
  const out: WorkoutSet[] = [];
  for (const s of sets) {
    if (s.isWarmup) {
      out.push(s);
      continue;
    }
    seen += 1;
    if (seen > keep) continue;
    out.push(timed ? s : { ...s, weight: roundWeight((s.weight * config.loadPercent) / 100, stack) });
  }
  return out;
}

/** Marca un ejercicio como «de descarga» y le aplica la reducción. */
export function deloadExercise(we: WorkoutExercise, config: Pick<DeloadConfig, 'loadPercent' | 'setsPercent'>, ex: Parameters<typeof isHold>[0], stack?: number[]): WorkoutExercise {
  return { ...we, deload: true, sets: applyDeloadToSets(we.sets, config, isHold(ex), stack) };
}
