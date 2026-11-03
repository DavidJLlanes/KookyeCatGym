import type { Exercise, Routine, WorkoutExercise, WorkoutLog } from '../types';
import { calculate1RM } from './oneRMEstimate';

// Programas de varias semanas: cada semana define series, repeticiones y % del
// máximo de entrenamiento de los levantamientos principales; el resto de
// ejercicios (accesorios) llevan series y repeticiones fijas y el peso de la
// última vez. Aquí solo hay lógica pura: los datos están en data/programs.ts.

export interface ProgramSet {
  reps: number;
  /** % del máximo de entrenamiento del ejercicio. */
  percent: number;
}

export interface ProgramWeek {
  label: string;
  /** Series de trabajo de los levantamientos principales. */
  scheme: ProgramSet[];
  deload?: boolean;
}

export interface ProgramExercise {
  exerciseId: string;
  /** Levantamiento principal: su carga sale del % del máximo. */
  main: boolean;
  rest: number;
  /** Principal: limita el número de series de la semana. Accesorio: series. */
  sets?: number;
  /** Solo accesorios: repeticiones (o segundos en ejercicios de mantener). */
  reps?: number;
}

export interface ProgramDay {
  name: string;
  exercises: ProgramExercise[];
}

export interface Program {
  id: string;
  name: string;
  tagline: string;
  level: string;
  days: ProgramDay[];
  weeks: ProgramWeek[];
}

/** Programa en marcha. Se guarda en los datos del usuario ('program'). */
export interface ActiveProgram {
  programId: string;
  /** Primer día del programa (YYYY-MM-DD); cuentan los entrenamientos desde ese día. */
  startDate: string;
  /** Máximo de entrenamiento (kg) de cada levantamiento principal. */
  trainingMaxes: Record<string, number>;
}

export const PLATE_STEP = 2.5;
const LOWER_BODY_BUMP = 5;
const UPPER_BODY_BUMP = 2.5;
const LOWER_BODY = new Set(['1436', '0032']);

/** Redondea a los discos que hay (2,5 kg por defecto). */
export const roundToStep = (kg: number, step = PLATE_STEP): number => Math.round(kg / step) * step;

/** Ids de los levantamientos principales del programa, sin repetir. */
export function mainLifts(program: Program): string[] {
  return [...new Set(program.days.flatMap((d) => d.exercises.filter((e) => e.main).map((e) => e.exerciseId)))];
}

export const sessionsPerCycle = (program: Program): number => program.weeks.length * program.days.length;

/** Prefijo con el que se nombran los entrenamientos del programa (sirve para contarlos). */
export const programPrefix = (program: Program): string => `${program.name} · `;

export interface ProgramPosition {
  /** Entrenamientos del programa ya hechos. */
  done: number;
  total: number;
  finished: boolean;
  /** Índices de la siguiente sesión (si no ha terminado). */
  week: number;
  day: number;
}

/** Dónde vas: se cuentan los entrenamientos guardados con el nombre del programa desde el inicio. */
export function programPosition(program: Program, active: ActiveProgram, logs: WorkoutLog[]): ProgramPosition {
  const prefix = programPrefix(program);
  const done = logs.filter((l) => l.routineName.startsWith(prefix) && l.date.slice(0, 10) >= active.startDate).length;
  const total = sessionsPerCycle(program);
  const idx = Math.min(done, total - 1);
  return { done, total, finished: done >= total, week: Math.floor(idx / program.days.length), day: idx % program.days.length };
}

/** Nombre con el que se guarda el entrenamiento: «Programa · Semana · Día». */
export const sessionName = (program: Program, week: number, day: number): string =>
  `${programPrefix(program)}${program.weeks[week].label} · ${program.days[day].name}`;

/**
 * Rutina de una sesión concreta (sin guardar). Los principales llevan el peso
 * calculado; los accesorios, peso 0 (se rellena con el de la última vez).
 */
export function buildProgramRoutine(program: Program, active: ActiveProgram, week: number, day: number): Routine {
  const w = program.weeks[week];
  const exercises: WorkoutExercise[] = program.days[day].exercises.map((pe, i) => {
    let sets;
    if (pe.main) {
      const tm = active.trainingMaxes[pe.exerciseId] ?? 0;
      const scheme = pe.sets ? w.scheme.slice(-pe.sets) : w.scheme;
      sets = scheme.map((s, j) => ({ id: `ps-${week}-${day}-${i}-${j}`, weight: roundToStep((tm * s.percent) / 100), reps: s.reps, completed: false }));
    } else {
      sets = Array.from({ length: pe.sets ?? 3 }, (_, j) => ({ id: `ps-${week}-${day}-${i}-${j}`, weight: 0, reps: pe.reps ?? 10, completed: false }));
    }
    return { id: `pe-${week}-${day}-${i}`, exerciseId: pe.exerciseId, restTime: pe.rest, sets };
  });
  return { id: `program-${program.id}-${week}-${day}`, name: sessionName(program, week, day), description: `${program.name} · ${w.label}`, exercises };
}

/**
 * Máximo de entrenamiento sugerido para empezar: el 90 % del mejor 1RM
 * estimado (últimos seis meses, series de hasta 12 repeticiones). null si no hay datos.
 */
export function suggestTrainingMax(exerciseId: string, logs: WorkoutLog[]): number | null {
  const cutoff = Date.now() - 180 * 86400000;
  let best = 0;
  for (const log of logs) {
    if (new Date(log.date).getTime() < cutoff) continue;
    for (const we of log.exercises) {
      if (we.exerciseId !== exerciseId) continue;
      for (const s of we.sets) {
        if (s.completed && !s.isWarmup && s.weight > 0 && s.reps >= 1 && s.reps <= 12) best = Math.max(best, calculate1RM(s.weight, s.reps));
      }
    }
  }
  return best > 0 ? roundToStep(best * 0.9) : null;
}

/** Máximos para una nueva vuelta: +5 kg en sentadilla y peso muerto, +2,5 kg en el resto. */
export function bumpedMaxes(maxes: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(maxes).map(([id, kg]) => [id, kg + (LOWER_BODY.has(id) ? LOWER_BODY_BUMP : UPPER_BODY_BUMP)]));
}

/** Nombres legibles de los principales (para pedir los máximos). */
export const liftName = (id: string, exercises: Exercise[]): string => exercises.find((e) => e.id === id)?.name ?? id;
