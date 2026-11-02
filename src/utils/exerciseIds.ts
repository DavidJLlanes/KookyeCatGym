import legacyIds from '../data/legacyIds.json';

// Red de seguridad de la unificación de ids: los ejercicios emparejados con el
// catálogo importado pasaron de su id antiguo (p. ej. "EIeI8Vf") al del
// catálogo ("0025"). La base de datos se migra con scripts/migrate-ids.py, pero
// pueden quedar ids antiguos en cachés del navegador, en otro dispositivo sin
// sincronizar o en copias de seguridad exportadas antes del cambio. Estas
// funciones los traducen al cargar para que ningún ejercicio quede "huérfano".
// Con datos ya migrados no hacen nada (devuelven el mismo objeto).
const MAP = legacyIds as Record<string, string>;

export const remapExerciseId = (id: string): string => MAP[id] ?? id;

interface HasExerciseId {
  exerciseId: string;
}

function remapEntries<T extends HasExerciseId>(list: T[] | undefined): T[] | undefined {
  if (!Array.isArray(list)) return list;
  let changed = false;
  const out = list.map((we) => {
    const next = MAP[we?.exerciseId];
    if (!next) return we;
    changed = true;
    return { ...we, exerciseId: next };
  });
  return changed ? out : list;
}

function remapWorkoutLike<T extends { exercises: HasExerciseId[] }>(item: T): T {
  const exercises = remapEntries(item.exercises);
  return exercises === item.exercises ? item : { ...item, exercises: exercises as T['exercises'] };
}

/** Rutinas o entrenamientos (WorkoutLog): cualquier lista de objetos con `exercises`. */
export function remapWorkoutList<T extends { exercises: HasExerciseId[] }>(items: T[]): T[] {
  if (!Array.isArray(items)) return items;
  return items.map(remapWorkoutLike);
}

/** Entrenamiento activo (o null). */
export function remapActiveWorkout<T extends { exercises: HasExerciseId[] }>(active: T | null): T | null {
  return active ? remapWorkoutLike(active) : active;
}

/** Reglas de progresión y fotos/vídeos propios: objetos con `exerciseId`. */
export function remapByExerciseId<T extends { exerciseId?: string | null }>(items: T[]): T[] {
  if (!Array.isArray(items)) return items;
  return items.map((it) => (it.exerciseId && MAP[it.exerciseId] ? { ...it, exerciseId: MAP[it.exerciseId] } : it));
}
