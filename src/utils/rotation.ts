import type { Routine, WorkoutLog } from '../types';
import type { RotationConfig } from './userData';

// Rotación de sesiones: en vez de ligar cada rutina a un día de la semana, las
// rutinas elegidas forman un ciclo (A, B, C, A, B, C...) y la siguiente sesión
// es simplemente la que toca después de la última que hiciste, vayas el día
// que vayas. Si te saltas una semana, no se salta ninguna sesión.

/** Rutinas del ciclo, en su orden, descartando las que ya no existen. */
export function rotationRoutines(config: RotationConfig, routines: Routine[]): Routine[] {
  const byId = new Map(routines.map((r) => [r.id, r]));
  const seen = new Set<string>();
  const out: Routine[] = [];
  for (const id of config.routineIds) {
    const r = byId.get(id);
    if (r && !seen.has(id)) {
      seen.add(id);
      out.push(r);
    }
  }
  return out;
}

/**
 * Las siguientes `count` sesiones del ciclo (la primera es "la de hoy"). Parte
 * de la rutina del ciclo que hiciste más recientemente; si todavía no has hecho
 * ninguna, empieza por la primera.
 */
export function upcomingInRotation(config: RotationConfig, routines: Routine[], logs: WorkoutLog[], count = 3): Routine[] {
  if (!config.enabled) return [];
  const cycle = rotationRoutines(config, routines);
  if (cycle.length === 0) return [];

  const position = new Map(cycle.map((r, i) => [r.id, i]));
  let lastIndex = -1;
  let lastTime = -Infinity;
  for (const log of logs) {
    const idx = log.routineId !== undefined ? position.get(log.routineId) : undefined;
    if (idx === undefined) continue;
    const t = new Date(log.date).getTime();
    if (Number.isFinite(t) && t > lastTime) {
      lastTime = t;
      lastIndex = idx;
    }
  }

  const start = (lastIndex + 1) % cycle.length;
  return Array.from({ length: Math.min(count, cycle.length) }, (_, i) => cycle[(start + i) % cycle.length]);
}

/** Letra del ciclo (A, B, C...) para mostrarla junto al nombre. */
export const cycleLetter = (index: number): string => String.fromCharCode(65 + (index % 26));
