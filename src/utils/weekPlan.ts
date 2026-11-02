import type { Routine, WorkoutLog } from '../types';
import { localDayKey, PlanMove, WeekStart } from './userData';

// Plan semanal derivado de los días que tiene cada rutina («Lunes», «Lunes y
// Jueves»...). Las sesiones se pueden mover a otro día SOLO para una semana
// concreta, sin tocar la rutina ni el resto de semanas.

/** Días en orden de calendario: índice 0 = lunes ... 6 = domingo. */
export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;
export const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** «Lunes y Jueves» → [0, 3]. Cualquier otro texto («Cualquier día», «Pierna») → sin días. */
export function parseDays(text: string | undefined): number[] {
  if (!text) return [];
  const t = strip(text);
  const found: number[] = [];
  DAY_NAMES.forEach((name, i) => {
    if (new RegExp(`\\b${strip(name)}s?\\b`).test(t)) found.push(i);
  });
  return found;
}

/** 0 = lunes ... 6 = domingo, para una fecha. */
export const dayIndexOf = (d: Date): number => (d.getDay() + 6) % 7;

/** Primer día (YYYY-MM-DD) de la semana de una fecha, según empiece en lunes o domingo. */
export function weekStartKey(date: Date, weekStart: WeekStart): string {
  const idx = dayIndexOf(date); // 0 = lunes
  const back = weekStart === 'mon' ? idx : (idx + 1) % 7;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - back, 12);
  return localDayKey(d);
}

/** Orden en que se muestran los días (índices de calendario, 0 = lunes). */
export function weekOrder(weekStart: WeekStart): number[] {
  return weekStart === 'mon' ? [0, 1, 2, 3, 4, 5, 6] : [6, 0, 1, 2, 3, 4, 5];
}

export interface PlannedSession {
  routine: Routine;
  /** Día original de la rutina (0 = lunes). */
  fromDay: number;
  /** Día en el que toca esta semana (distinto de fromDay si se movió). */
  day: number;
  moved: boolean;
  done: boolean;
}

export interface PlanDay {
  date: string; // YYYY-MM-DD
  dayIndex: number; // 0 = lunes
  isToday: boolean;
  sessions: PlannedSession[];
}

const addDays = (key: string, n: number): string => {
  const [y, m, d] = key.split('-').map(Number);
  return localDayKey(new Date(y, m - 1, d + n, 12));
};

/**
 * La semana de `today`: qué sesiones tocan cada día (con los movimientos de esa
 * semana aplicados) y cuáles ya se hicieron. Las repeticiones de una rutina en
 * la semana se emparejan por orden con sus entrenamientos hechos esa semana.
 */
export function buildWeek(routines: Routine[], moves: PlanMove[], logs: WorkoutLog[], today: Date, weekStart: WeekStart): PlanDay[] {
  const startKey = weekStartKey(today, weekStart);
  const order = weekOrder(weekStart);
  const todayKey = localDayKey(today);
  const dates = order.map((_, i) => addDays(startKey, i));
  const weekMoves = moves.filter((m) => m.week === startKey);

  // Sesiones previstas (rutina × día), con los movimientos de esta semana
  const planned: PlannedSession[] = [];
  for (const routine of routines) {
    for (const fromDay of parseDays(routine.dayOfWeek)) {
      const move = weekMoves.find((m) => m.routineId === routine.id && m.from === fromDay);
      const day = move ? move.to : fromDay;
      planned.push({ routine, fromDay, day, moved: !!move && move.to !== fromDay, done: false });
    }
  }

  // Entrenamientos de esta semana, por rutina
  const logsByRoutine = new Map<string, number>();
  for (const l of logs) {
    if (l.routineId && dates.includes(localDayKey(new Date(l.date)))) {
      logsByRoutine.set(l.routineId, (logsByRoutine.get(l.routineId) ?? 0) + 1);
    }
  }

  // La k-ésima sesión (por día) de una rutina queda hecha si hay k entrenamientos suyos esta semana
  const byRoutine = new Map<string, PlannedSession[]>();
  for (const p of planned) byRoutine.set(p.routine.id, [...(byRoutine.get(p.routine.id) ?? []), p]);
  for (const [id, list] of byRoutine) {
    list.sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
    const doneCount = logsByRoutine.get(id) ?? 0;
    list.forEach((p, i) => {
      p.done = i < doneCount;
    });
  }

  return order.map((dayIndex, i) => ({
    date: dates[i],
    dayIndex,
    isToday: dates[i] === todayKey,
    sessions: planned.filter((p) => p.day === dayIndex),
  }));
}

/** Mueve una sesión de `from` a `to` solo en la semana `week`. `to === from` deshace el movimiento. */
export function moveSession(moves: PlanMove[], week: string, routineId: string, from: number, to: number, today: Date = new Date(), keepWeeks = 8): PlanMove[] {
  const rest = moves.filter((m) => !(m.week === week && m.routineId === routineId && m.from === from));
  const next = to === from ? rest : [...rest, { week, routineId, from, to }];
  // Se descartan los movimientos de semanas muy antiguas
  const limit = addDays(localDayKey(today), -7 * keepWeeks);
  return next.filter((m) => m.week >= limit);
}
