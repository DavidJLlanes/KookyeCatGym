import type { Exercise, WorkoutLog, WorkoutSet } from '../../types';

export const set = (weight: number, reps: number, extra: Partial<WorkoutSet> = {}): WorkoutSet => ({ id: `s-${weight}-${reps}-${Math.random()}`, weight, reps, completed: true, ...extra });

export const exercise = (id: string, name: string, extra: Partial<Exercise> = {}): Exercise =>
  ({ id, name, muscleGroup: 'Pecho', equipment: 'Barra', imageUrl: '', defaultRestTime: 90, instructions: [], category: 'Fuerza', ...extra }) as Exercise;

export const log = (id: string, date: string, exercises: { exerciseId: string; sets: WorkoutSet[] }[], routineName = 'Rutina'): WorkoutLog => ({
  id,
  routineName,
  date,
  duration: 3600,
  exercises: exercises.map((e, i) => ({ id: `we-${id}-${i}`, exerciseId: e.exerciseId, restTime: 90, sets: e.sets })),
});
