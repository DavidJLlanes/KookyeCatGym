import { WorkoutLog, WorkoutExercise } from '../types';

export interface PRRecord {
  type: 'weight' | 'reps' | 'volume';
  exerciseName: string;
  previousRecord: number;
  newRecord: number;
  percentage: number; // percent improvement
}

export interface SessionPRs {
  records: PRRecord[];
  isNewSessionPR: boolean; // any PR achieved in this session
}

/**
 * Compare a completed workout against previous logs to detect new Personal Records
 */
export function detectSessionPRs(
  newWorkout: {
    routineName: string;
    exercises: WorkoutExercise[];
  },
  exerciseNameMap: Map<string, string>, // exerciseId -> exerciseName
  previousLogs: WorkoutLog[]
): SessionPRs {
  const records: PRRecord[] = [];

  // Build a map of best previous performances per exercise
  const bestPerExercise = new Map<string, { weight: number; reps: number; volume: number }>();

  for (const log of previousLogs) {
    for (const ex of log.exercises) {
      if (!bestPerExercise.has(ex.exerciseId)) {
        bestPerExercise.set(ex.exerciseId, { weight: 0, reps: 0, volume: 0 });
      }

      const best = bestPerExercise.get(ex.exerciseId)!;
      let sessionVolume = 0;
      let maxWeight = 0;
      let maxReps = 0;

      for (const set of ex.sets) {
        if (set.completed) {
          const volume = set.weight * set.reps;
          sessionVolume += volume;
          maxWeight = Math.max(maxWeight, set.weight);
          maxReps = Math.max(maxReps, set.reps);
        }
      }

      best.weight = Math.max(best.weight, maxWeight);
      best.reps = Math.max(best.reps, maxReps);
      best.volume = Math.max(best.volume, sessionVolume);
    }
  }

  // Check new workout against best records
  for (const ex of newWorkout.exercises) {
    const exerciseName = exerciseNameMap.get(ex.exerciseId) || 'Ejercicio desconocido';
    const best = bestPerExercise.get(ex.exerciseId);

    if (!best) {
      // First time doing this exercise
      let sessionVolume = 0;
      let maxWeight = 0;
      let maxReps = 0;

      for (const set of ex.sets) {
        if (set.completed) {
          const volume = set.weight * set.reps;
          sessionVolume += volume;
          maxWeight = Math.max(maxWeight, set.weight);
          maxReps = Math.max(maxReps, set.reps);
        }
      }

      if (maxWeight > 0) {
        records.push({
          type: 'weight',
          exerciseName,
          previousRecord: 0,
          newRecord: maxWeight,
          percentage: 100,
        });
      }
      if (maxReps > 0) {
        records.push({
          type: 'reps',
          exerciseName,
          previousRecord: 0,
          newRecord: maxReps,
          percentage: 100,
        });
      }
      if (sessionVolume > 0) {
        records.push({
          type: 'volume',
          exerciseName,
          previousRecord: 0,
          newRecord: Math.round(sessionVolume),
          percentage: 100,
        });
      }
      continue;
    }

    let sessionVolume = 0;
    let maxWeight = 0;
    let maxReps = 0;

    for (const set of ex.sets) {
      if (set.completed) {
        const volume = set.weight * set.reps;
        sessionVolume += volume;
        maxWeight = Math.max(maxWeight, set.weight);
        maxReps = Math.max(maxReps, set.reps);
      }
    }

    // Weight PR
    if (maxWeight > best.weight) {
      const percentage = ((maxWeight - best.weight) / best.weight) * 100;
      records.push({
        type: 'weight',
        exerciseName,
        previousRecord: best.weight,
        newRecord: maxWeight,
        percentage,
      });
    }

    // Reps PR
    if (maxReps > best.reps && maxWeight >= best.weight * 0.95) {
      // Only count if weight is close to previous max weight
      const percentage = ((maxReps - best.reps) / best.reps) * 100;
      records.push({
        type: 'reps',
        exerciseName,
        previousRecord: best.reps,
        newRecord: maxReps,
        percentage,
      });
    }

    // Volume PR
    if (sessionVolume > best.volume) {
      const percentage = ((sessionVolume - best.volume) / best.volume) * 100;
      records.push({
        type: 'volume',
        exerciseName,
        previousRecord: Math.round(best.volume),
        newRecord: Math.round(sessionVolume),
        percentage,
      });
    }
  }

  return {
    records,
    isNewSessionPR: records.length > 0,
  };
}

/**
 * Format a PR record for display
 */
export function formatPRRecord(pr: PRRecord): string {
  const typeLabel = {
    weight: 'Peso',
    reps: 'Reps',
    volume: 'Volumen',
  }[pr.type];

  if (pr.previousRecord === 0) {
    return `🎉 ${pr.exerciseName}: Primer PR en ${typeLabel}! ${pr.newRecord}${pr.type === 'weight' ? 'kg' : pr.type === 'volume' ? ' total' : ''}`;
  }

  return `🏆 ${pr.exerciseName}: Nuevo PR en ${typeLabel}! ${pr.previousRecord} → ${pr.newRecord} (+${pr.percentage.toFixed(1)}%)`;
}

/**
 * Get emoji based on percentage gain
 */
export function getPREmoji(percentage: number): string {
  if (percentage >= 25) return '🚀';
  if (percentage >= 10) return '💪';
  if (percentage >= 5) return '⬆️';
  return '✨';
}
