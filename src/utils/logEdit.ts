import type { Exercise, WorkoutExercise, WorkoutLog, WorkoutSet } from '../types';
import { defaultReps } from './holdSets';

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO → valor de <input type="datetime-local"> (hora local, sin zona). */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Valor de <input type="datetime-local"> → ISO (o null si no es una fecha válida). */
export function fromLocalInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now()}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function newSet(ex: Exercise | undefined, like?: WorkoutSet): WorkoutSet {
  return { id: uid('set-edit'), weight: like?.weight ?? 0, reps: like?.reps ?? defaultReps(ex), completed: true };
}

export function newWorkoutExercise(ex: Exercise): WorkoutExercise {
  return { id: uid('we-edit'), exerciseId: ex.id, restTime: ex.defaultRestTime, sets: [newSet(ex)] };
}

/** Un entrenamiento vacío para registrar uno hecho en papel. */
export function blankLog(now: Date = new Date()): WorkoutLog {
  return { id: uid('log-manual'), routineName: '', date: now.toISOString(), duration: 3600, exercises: [] };
}

/** Primer problema que impide guardar, o null si está bien. */
export function validateLog(log: WorkoutLog, now: Date = new Date()): string | null {
  if (!log.routineName.trim()) return 'Ponle un nombre al entrenamiento.';
  const t = new Date(log.date).getTime();
  if (!Number.isFinite(t)) return 'La fecha no es válida.';
  if (t > now.getTime() + 60_000) return 'La fecha no puede estar en el futuro.';
  if (!Number.isFinite(log.duration) || log.duration < 0 || log.duration > 24 * 3600) return 'La duración debe estar entre 0 y 24 horas.';
  if (log.exercises.length === 0) return 'Añade al menos un ejercicio.';
  for (const we of log.exercises) {
    if (we.sets.length === 0) return 'Cada ejercicio necesita al menos una serie (o quítalo).';
    for (const s of we.sets) {
      if (!Number.isFinite(s.weight) || s.weight < 0 || s.weight > 1000) return 'Hay un peso fuera de rango.';
      if (!Number.isFinite(s.reps) || s.reps < 0 || s.reps > 10000) return 'Hay unas repeticiones fuera de rango.';
    }
  }
  if (!log.exercises.some((we) => we.sets.some((s) => s.completed))) return 'Marca al menos una serie como hecha.';
  return null;
}
