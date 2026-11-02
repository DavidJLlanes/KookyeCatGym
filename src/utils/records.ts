import { Exercise, WorkoutExercise, WorkoutLog } from '../types';

export interface RecordSummary {
  weightRecords: Record<string, number>; // grupo muscular -> nº de ejercicios con récord de peso
  repRecords: Record<string, number>; // grupo muscular -> nº de ejercicios con récord de repeticiones
}

// Compara las series completadas de la sesión recién finalizada contra el
// mejor histórico (peso y repeticiones) de cada ejercicio en sesiones
// anteriores. Solo cuenta como récord si ya existía un histórico que batir
// (la primera vez que se hace un ejercicio no cuenta como récord).
export function computeSessionRecords(
  sessionExercises: WorkoutExercise[],
  previousLogs: WorkoutLog[],
  exercises: Exercise[]
): RecordSummary {
  const weightRecords: Record<string, number> = {};
  const repRecords: Record<string, number> = {};

  // Agrupa los bloques de la sesión por ejercicio primero: si el mismo
  // ejercicio aparece en dos bloques (se repitió o se añadió a media
  // sesión), debe contar como un único candidato a récord, no dos —
  // antes cada bloque se evaluaba por separado y podía inflar el recuento.
  const completedSetsByExercise = new Map<string, { weight: number; reps: number }[]>();
  for (const we of sessionExercises) {
    const completed = we.sets.filter((s) => s.completed);
    if (completed.length === 0) continue;
    const existing = completedSetsByExercise.get(we.exerciseId) ?? [];
    completedSetsByExercise.set(we.exerciseId, existing.concat(completed));
  }

  for (const [exerciseId, completedSets] of completedSetsByExercise) {
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) continue;

    let historicalMaxWeight = 0;
    let historicalMaxReps = 0;
    let hasHistory = false;
    for (const log of previousLogs) {
      // Un log histórico también puede tener el ejercicio repartido en
      // varios bloques: hay que mirarlos todos, no solo el primero que
      // encuentre .find() (eso subestimaba el histórico real).
      const matches = log.exercises.filter((le) => le.exerciseId === exerciseId);
      for (const match of matches) {
        for (const s of match.sets) {
          if (!s.completed) continue;
          hasHistory = true;
          if (s.weight > historicalMaxWeight) historicalMaxWeight = s.weight;
          if (s.reps > historicalMaxReps) historicalMaxReps = s.reps;
        }
      }
    }

    if (!hasHistory) continue;

    const sessionMaxWeight = Math.max(...completedSets.map((s) => s.weight));
    const sessionMaxReps = Math.max(...completedSets.map((s) => s.reps));

    if (sessionMaxWeight > historicalMaxWeight) {
      weightRecords[exercise.muscleGroup] = (weightRecords[exercise.muscleGroup] || 0) + 1;
    }
    if (sessionMaxReps > historicalMaxReps) {
      repRecords[exercise.muscleGroup] = (repRecords[exercise.muscleGroup] || 0) + 1;
    }
  }

  return { weightRecords, repRecords };
}

export interface PrEvent {
  date: string; // ISO
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  type: 'weight' | 'reps';
  value: number;
  previousValue: number;
  // Ejercicio por tiempo: el récord de "reps" son segundos
  hold?: boolean;
}

// Recorre todo el histórico en orden cronológico y genera un evento cada vez
// que una sesión bate el máximo (de peso o de repeticiones) que existía
// hasta ese momento para un ejercicio. A diferencia de computeSessionRecords
// (que compara UNA sesión contra todo lo anterior), esto reconstruye la
// racha completa de récords a lo largo de la vida de la cuenta, útil para un
// feed navegable en vez de solo el aviso del último entrenamiento.
export function computeAllTimeRecords(logs: WorkoutLog[], exercises: Exercise[]): PrEvent[] {
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const bestWeight: Record<string, number> = {};
  const bestReps: Record<string, number> = {};
  const events: PrEvent[] = [];

  for (const log of sortedLogs) {
    for (const we of log.exercises) {
      const completedSets = we.sets.filter((s) => s.completed);
      if (completedSets.length === 0) continue;

      const exercise = exercises.find((e) => e.id === we.exerciseId);
      if (!exercise) continue;

      const sessionMaxWeight = Math.max(...completedSets.map((s) => s.weight));
      const sessionMaxReps = Math.max(...completedSets.map((s) => s.reps));

      const prevWeight = bestWeight[we.exerciseId] ?? 0;
      const prevReps = bestReps[we.exerciseId] ?? 0;

      if (sessionMaxWeight > prevWeight) {
        if (prevWeight > 0) {
          events.push({
            date: log.date,
            exerciseId: we.exerciseId,
            exerciseName: exercise.name,
            muscleGroup: exercise.muscleGroup,
            type: 'weight',
            value: sessionMaxWeight,
            previousValue: prevWeight,
          });
        }
        bestWeight[we.exerciseId] = sessionMaxWeight;
      }

      if (sessionMaxReps > prevReps) {
        if (prevReps > 0) {
          events.push({
            date: log.date,
            exerciseId: we.exerciseId,
            exerciseName: exercise.name,
            muscleGroup: exercise.muscleGroup,
            type: 'reps',
            value: sessionMaxReps,
            previousValue: prevReps,
            hold: exercise.hold || undefined,
          });
        }
        bestReps[we.exerciseId] = sessionMaxReps;
      }
    }
  }

  // Más reciente primero, para un feed tipo "timeline"
  return events.reverse();
}

function joinGroups(entries: [string, number][]): string {
  const names = entries.map(([g]) => g);
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

// Genera el mensaje del aviso, ej:
// "Hoy has batido 2 récords de peso en Piernas, y 1 récord de repeticiones en Pecho."
// Devuelve null si no hubo ningún récord en la sesión.
export function formatRecordsMessage(summary: RecordSummary): string | null {
  const weightEntries = Object.entries(summary.weightRecords);
  const repEntries = Object.entries(summary.repRecords);
  const weightTotal = weightEntries.reduce((sum, [, c]) => sum + c, 0);
  const repTotal = repEntries.reduce((sum, [, c]) => sum + c, 0);

  if (weightTotal === 0 && repTotal === 0) return null;

  const segments: string[] = [];
  if (weightTotal > 0) {
    segments.push(`${weightTotal} récord${weightTotal === 1 ? '' : 's'} de peso en ${joinGroups(weightEntries)}`);
  }
  if (repTotal > 0) {
    segments.push(`${repTotal} récord${repTotal === 1 ? '' : 's'} de repeticiones en ${joinGroups(repEntries)}`);
  }

  return `Hoy has batido ${segments.join(', y ')}.`;
}
