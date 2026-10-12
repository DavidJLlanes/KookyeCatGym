import { WorkoutLog, Exercise } from '../types';

export interface OneRMEstimate {
  weight: number;
  formula: string;
  date: string;
}

export interface OneRMHistory {
  exerciseId: string;
  exerciseName: string;
  current1RM: number;
  maxHistorical1RM: number;
  estimates: OneRMEstimate[];
  maxPercentage: number; // % of maxHistorical
}

/**
 * Estimate 1RM using Epley formula: 1RM = weight × (1 + reps/30)
 * Accuracy: Most accurate for reps 1-10
 */
export function estimateOneRMEpley(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/**
 * Estimate 1RM using Brzycki formula: 1RM = weight / (1.0278 - 0.0278 × reps)
 * Accuracy: Better for higher reps (8-15)
 */
export function estimateOneRMBrzycki(weight: number, reps: number): number {
  if (reps === 1) return weight;
  const denominator = 1.0278 - 0.0278 * reps;
  if (denominator <= 0) return weight;
  return Math.round((weight / denominator) * 10) / 10;
}

/**
 * Estimate 1RM using Lombardi formula: 1RM = weight × reps^0.10
 * Simple power formula
 */
export function estimateOneRMLombardi(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * Math.pow(reps, 0.1) * 10) / 10;
}

/**
 * Average of all formulas for better estimate
 */
export function estimateOneRMAverage(weight: number, reps: number): number {
  if (reps === 1) return weight;
  const epley = estimateOneRMEpley(weight, reps);
  const brzycki = estimateOneRMBrzycki(weight, reps);
  const lombardi = estimateOneRMLombardi(weight, reps);
  return Math.round((epley + brzycki + lombardi) / 3);
}

/**
 * Calculate 1RM for a specific set
 * Uses multiple formulas and returns average
 */
export function calculate1RM(weight: number, reps: number): number {
  return estimateOneRMAverage(weight, reps);
}

/**
 * Get 1RM history for an exercise across all logs
 */
export function get1RMHistory(
  exerciseId: string,
  logs: WorkoutLog[],
  exercises: Exercise[]
): OneRMHistory | null {
  const exercise = exercises.find((e) => e.id === exerciseId);
  if (!exercise) return null;

  const estimates: OneRMEstimate[] = [];
  let maxHistorical1RM = 0;

  // Process logs in chronological order
  const sortedLogs = [...logs].reverse();
  for (const log of sortedLogs) {
    const workoutExercise = log.exercises.find((we) => we.exerciseId === exerciseId);
    if (!workoutExercise) continue;

    // Find heaviest set completed
    let maxWeight = 0;
    let repsAtMax = 0;

    for (const set of workoutExercise.sets) {
      if (set.completed && set.weight > 0) {
        if (set.weight > maxWeight || (set.weight === maxWeight && set.reps > repsAtMax)) {
          maxWeight = set.weight;
          repsAtMax = set.reps;
        }
      }
    }

    if (maxWeight > 0) {
      const estimated1RM = calculate1RM(maxWeight, repsAtMax);
      estimates.push({
        weight: estimated1RM,
        formula: `${maxWeight}kg × ${repsAtMax} reps`,
        date: log.date,
      });

      if (estimated1RM > maxHistorical1RM) {
        maxHistorical1RM = estimated1RM;
      }
    }
  }

  if (estimates.length === 0) return null;

  const current1RM = estimates[0]?.weight || 0;
  const maxPercentage = maxHistorical1RM > 0 ? Math.round((current1RM / maxHistorical1RM) * 100) : 100;

  return {
    exerciseId,
    exerciseName: exercise.name,
    current1RM,
    maxHistorical1RM,
    estimates,
    maxPercentage,
  };
}

/**
 * Format 1RM estimate for display
 */
export function format1RM(rm: OneRMHistory): string {
  return `${rm.current1RM.toFixed(1)}kg (${rm.maxPercentage}% of max)`;
}

/**
 * Get estimated max reps at a given weight
 */
export function estimateRepsAtWeight(current1RM: number, targetWeight: number): number {
  if (targetWeight >= current1RM) return 1;
  // Use inverse Epley formula: reps = (1RM/weight - 1) × 30
  const reps = (current1RM / targetWeight - 1) * 30;
  return Math.max(1, Math.round(reps));
}

/**
 * Get suggested weight for target reps
 */
export function suggestWeightForReps(current1RM: number, targetReps: number): number {
  // Use Epley formula inverse
  const weight = current1RM / (1 + targetReps / 30);
  return Math.round(weight * 10) / 10;
}
