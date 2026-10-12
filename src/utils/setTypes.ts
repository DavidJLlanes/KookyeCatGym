import { WorkoutExercise, WorkoutSet } from '../types';

export type SetKind = 'normal' | 'warmup' | 'drop' | 'failure' | 'restpause';

export const SET_KINDS: { kind: SetKind; label: string; short: string; color: string; hint: string }[] = [
  { kind: 'normal', label: 'Normal', short: '', color: '#94a3b8', hint: 'Serie de trabajo' },
  { kind: 'warmup', label: 'Calentamiento', short: 'W', color: '#fbbf24', hint: 'No cuenta para récords ni progresión' },
  { kind: 'drop', label: 'Drop set', short: 'D', color: '#a78bfa', hint: 'Sin descanso desde la serie anterior' },
  { kind: 'failure', label: 'Al fallo', short: 'F', color: '#f87171', hint: 'Hasta no poder hacer otra repetición' },
  { kind: 'restpause', label: 'Rest-pause', short: 'RP', color: '#38bdf8', hint: '15 s de pausa desde la serie anterior' },
];

export const REST_PAUSE_SECONDS = 15;

export function kindOf(set: WorkoutSet): SetKind {
  if (set.isWarmup) return 'warmup';
  return set.setType ?? 'normal';
}

export function withKind(set: WorkoutSet, kind: SetKind): WorkoutSet {
  const { isWarmup: _w, setType: _t, ...rest } = set;
  if (kind === 'warmup') return { ...rest, isWarmup: true };
  if (kind === 'normal') return rest;
  return { ...rest, setType: kind };
}

/** Etiqueta de la columna "Serie": W/D/F/RP o el número entre las series normales y al fallo. */
export function setLabel(sets: WorkoutSet[], index: number): string {
  const meta = SET_KINDS.find((k) => k.kind === kindOf(sets[index]));
  if (meta?.short && meta.kind !== 'failure') return meta.short;
  const number = sets.slice(0, index + 1).filter((s) => !s.isWarmup && s.setType !== 'drop' && s.setType !== 'restpause').length;
  return meta?.kind === 'failure' ? `${number}F` : `#${number}`;
}

/** Índices [inicio, fin] de la superserie a la que pertenece el ejercicio, o null. */
export function supersetBounds(exercises: WorkoutExercise[], index: number): [number, number] | null {
  const id = exercises[index]?.supersetId;
  if (!id) return null;
  let start = index;
  let end = index;
  while (start > 0 && exercises[start - 1].supersetId === id) start--;
  while (end < exercises.length - 1 && exercises[end + 1].supersetId === id) end++;
  return end > start ? [start, end] : null;
}

/**
 * Une el ejercicio `index` con el siguiente en una superserie o, si ya lo
 * estaban, los separa. Devuelve una lista nueva; los grupos que se quedan con
 * un solo ejercicio dejan de ser superserie.
 */
export function toggleSupersetWithNext(exercises: WorkoutExercise[], index: number): WorkoutExercise[] {
  const list: WorkoutExercise[] = exercises.map((we) => ({ ...we }));
  const current = list[index];
  const next = list[index + 1];
  if (!current || !next) return list;

  if (current.supersetId && current.supersetId === next.supersetId) {
    // Separar: los ejercicios que siguen en el grupo pasan a otro grupo
    const oldId = current.supersetId;
    const newId = `ss-${Date.now()}`;
    for (let i = index + 1; i < list.length && list[i].supersetId === oldId; i++) list[i].supersetId = newId;
  } else {
    const id = current.supersetId || next.supersetId || `ss-${Date.now()}`;
    const oldNextId = next.supersetId;
    current.supersetId = id;
    // El siguiente entra con todo su grupo, si ya tenía uno
    for (let i = index + 1; i < list.length; i++) {
      if (i > index + 1 && (!oldNextId || list[i].supersetId !== oldNextId)) break;
      list[i].supersetId = id;
    }
  }

  list.forEach((we, i) => {
    if (we.supersetId && !supersetBounds(list, i)) delete we.supersetId;
  });
  return list;
}

/** Quita la marca de superserie a los ejercicios que se han quedado solos (al mover o quitar ejercicios). */
export function normalizeSupersets(exercises: WorkoutExercise[]): WorkoutExercise[] {
  return exercises.map((we, i) => {
    if (!we.supersetId || supersetBounds(exercises, i)) return we;
    const { supersetId: _s, ...rest } = we;
    return rest;
  });
}

/** Letra de cada superserie (A, B…) por orden de aparición, por id de instancia de ejercicio. */
export function supersetLetters(exercises: WorkoutExercise[]): Record<string, string> {
  const letters: Record<string, string> = {};
  let next = 0;
  for (let i = 0; i < exercises.length; i++) {
    const bounds = supersetBounds(exercises, i);
    if (!bounds) continue;
    if (i === bounds[0]) next++;
    letters[exercises[i].id] = String.fromCharCode(64 + next);
  }
  return letters;
}

/**
 * Segundos de descanso tras completar una serie:
 * - 0 si la siguiente serie del ejercicio es un drop set.
 * - 15 si la siguiente es rest-pause.
 * - 0 si el ejercicio forma parte de una superserie y no es el último del grupo
 *   (se pasa directamente al siguiente ejercicio).
 * - el descanso normal en cualquier otro caso.
 */
export function restAfterSet(
  exercises: WorkoutExercise[],
  exerciseIndex: number,
  setIndex: number,
  normalRest: number
): number {
  const next = exercises[exerciseIndex]?.sets[setIndex + 1];
  if (next?.setType === 'drop') return 0;
  if (next?.setType === 'restpause') return REST_PAUSE_SECONDS;

  const bounds = supersetBounds(exercises, exerciseIndex);
  if (bounds) {
    // Si algún ejercicio posterior del grupo tiene esta misma ronda, se va directo a él
    const laterHasRound = exercises
      .slice(exerciseIndex + 1, bounds[1] + 1)
      .some((we) => we.sets.length > setIndex);
    if (laterHasRound) return 0;
  }

  return normalRest;
}
