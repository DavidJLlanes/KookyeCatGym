import type { ActiveWorkout, Exercise, WorkoutExercise, WorkoutSet } from '../types';
import { swapForAlternative } from './exerciseSwap';
import { SetKind, toggleSupersetWithNext, withKind } from './setTypes';

// Cambios sobre el entrenamiento en curso. Son funciones puras (devuelven un
// entrenamiento nuevo, sin tocar el anterior) para poder probarlas aparte y
// para que los componentes no repitan el mismo `map` anidado en cada acción.

type ExerciseFn = (we: WorkoutExercise) => WorkoutExercise;
type SetFn = (set: WorkoutSet) => WorkoutSet;

export const mapExercise = (w: ActiveWorkout, weId: string, fn: ExerciseFn): ActiveWorkout => ({
  ...w,
  exercises: w.exercises.map((we) => (we.id === weId ? fn(we) : we)),
});

export const mapSet = (w: ActiveWorkout, weId: string, setId: string, fn: SetFn): ActiveWorkout =>
  mapExercise(w, weId, (we) => ({ ...we, sets: we.sets.map((s) => (s.id === setId ? fn(s) : s)) }));

export const findSet = (w: ActiveWorkout, weId: string, setId: string) => {
  const exercise = w.exercises.find((we) => we.id === weId);
  const setIndex = exercise ? exercise.sets.findIndex((s) => s.id === setId) : -1;
  return exercise && setIndex >= 0 ? { exercise, set: exercise.sets[setIndex], setIndex } : null;
};

export const updateSetField = (
  w: ActiveWorkout,
  weId: string,
  setId: string,
  field: 'weight' | 'reps' | 'distance',
  value: number
) => mapSet(w, weId, setId, (s) => ({ ...s, [field]: value }));

export const setRpe = (w: ActiveWorkout, weId: string, setId: string, rpe?: number) =>
  mapSet(w, weId, setId, (s) => ({ ...s, rpe }));

export const setKind = (w: ActiveWorkout, weId: string, setId: string, kind: SetKind) =>
  mapSet(w, weId, setId, (s) => withKind(s, kind));

export const toggleCompleted = (w: ActiveWorkout, weId: string, setId: string) =>
  mapSet(w, weId, setId, (s) => ({ ...s, completed: !s.completed }));

/** Cierra una serie por tiempo con los segundos que de verdad se aguantaron. */
export const completeWithReps = (w: ActiveWorkout, weId: string, setId: string, reps: number) =>
  mapSet(w, weId, setId, (s) => ({ ...s, reps, completed: true }));

export const addSet = (w: ActiveWorkout, weId: string, id: string = `set-${Date.now()}`) =>
  mapExercise(w, weId, (we) => {
    const last = we.sets[we.sets.length - 1];
    const set: WorkoutSet = { id: `${id}-${we.sets.length + 1}`, weight: last ? last.weight : 0, reps: last ? last.reps : 10, completed: false };
    return { ...we, sets: [...we.sets, set] };
  });

/** Quita una serie (siempre queda al menos una) y devuelve la quitada para poder deshacerlo. */
export function removeSet(w: ActiveWorkout, weId: string, setId: string) {
  const found = findSet(w, weId, setId);
  if (!found || found.exercise.sets.length <= 1) return { workout: w, removed: null };
  return {
    workout: mapExercise(w, weId, (we) => ({ ...we, sets: we.sets.filter((s) => s.id !== setId) })),
    removed: { weId, set: found.set, index: found.setIndex },
  };
}

export const restoreSet = (w: ActiveWorkout, weId: string, set: WorkoutSet, index: number) =>
  mapExercise(w, weId, (we) => {
    if (we.sets.some((s) => s.id === set.id)) return we;
    const sets = [...we.sets];
    sets.splice(Math.min(index, sets.length), 0, set);
    return { ...we, sets };
  });

/** Copia una serie justo debajo, con los mismos valores y sin marcar (sin RPE). */
export const duplicateSet = (w: ActiveWorkout, weId: string, setId: string) =>
  mapExercise(w, weId, (we) => {
    const index = we.sets.findIndex((s) => s.id === setId);
    if (index < 0) return we;
    const { rpe: _rpe, ...rest } = we.sets[index];
    const copy: WorkoutSet = { ...rest, id: `set-copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, completed: false };
    const sets = [...we.sets];
    sets.splice(index + 1, 0, copy);
    return { ...we, sets };
  });

export const togglePerSide = (w: ActiveWorkout, weId: string) =>
  mapExercise(w, weId, (we) => {
    const { perSide: _p, ...rest } = we;
    return we.perSide ? rest : { ...rest, perSide: true };
  });

export const toggleSupersetAt = (w: ActiveWorkout, index: number): ActiveWorkout => ({
  ...w,
  exercises: toggleSupersetWithNext(w.exercises, index),
});

export const removeExercise = (w: ActiveWorkout, weId: string): ActiveWorkout => ({
  ...w,
  exercises: w.exercises.filter((we) => we.id !== weId),
});

/** Mismo descanso para todos los ejercicios de la sesión. */
export const setAllRestTimes = (w: ActiveWorkout, seconds: number): ActiveWorkout => ({
  ...w,
  exercises: w.exercises.map((we) => ({ ...we, restTime: seconds })),
});

/** Cambia el ejercicio de un hueco por una alternativa, solo si aún no se ha completado ninguna serie. */
export const swapExercise = (
  w: ActiveWorkout,
  weId: string,
  replacement: Exercise,
  lastSets: WorkoutSet[] | null
): ActiveWorkout =>
  mapExercise(w, weId, (we) =>
    we.sets.some((s) => s.completed) ? we : swapForAlternative(we, replacement.id, replacement.defaultRestTime, lastSets)
  );

export const appendExercises = (w: ActiveWorkout, added: WorkoutExercise[], routineName?: string): ActiveWorkout => {
  const alreadyNamed = routineName ? w.routineName.split(' + ').includes(routineName) : true;
  return {
    ...w,
    routineName: alreadyNamed ? w.routineName : `${w.routineName} + ${routineName}`,
    exercises: [...w.exercises, ...added],
  };
};
