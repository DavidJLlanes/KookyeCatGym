import { WorkoutSet } from '../types';

export type ProgressionType = 'linear' | 'greyskull' | 'double_progression';

export interface ProgressionRule {
  exerciseId: string;
  type: ProgressionType;
  enabled: boolean;
  // Linear progression
  weightIncrement?: number; // kg to add each session
  // Double progression: increase reps first, then weight
  targetReps?: number; // when reached, jump weight and drop reps
  repIncrement?: number; // reps added per session
}

export interface ProgressedSet extends WorkoutSet {
  suggestedWeight?: number;
  suggestedReps?: number;
  progressionInfo?: string;
}

/**
 * Linear Progression: +weightIncrement kg each session
 */
export function applyLinearProgression(
  lastSet: WorkoutSet,
  increment: number = 2.5
): ProgressedSet {
  return {
    ...lastSet,
    completed: false,
    suggestedWeight: Math.round((lastSet.weight + increment) * 10) / 10,
    suggestedReps: lastSet.reps,
    progressionInfo: `Linear: +${increment}kg`,
  };
}

/**
 * Greyskull LP: Increase reps first (1-5 range), then when hit top end, jump weight and drop reps
 * Classic: Start 3×5, if hit 5×5, jump to 3×(5+2.5)
 */
export function applyGreyskullProgression(lastSet: WorkoutSet): ProgressedSet {
  const repsRange = 5; // 3-5 reps
  const weightJump = 2.5; // kg

  // If reached top of rep range, increase weight and drop back to bottom
  if (lastSet.reps >= repsRange) {
    return {
      ...lastSet,
      completed: false,
      suggestedWeight: Math.round((lastSet.weight + weightJump) * 10) / 10,
      suggestedReps: 3,
      progressionInfo: `Greyskull LP: Weight +${weightJump}kg, Reps → 3`,
    };
  }

  // Otherwise increase reps by 1
  return {
    ...lastSet,
    completed: false,
    suggestedWeight: lastSet.weight,
    suggestedReps: lastSet.reps + 1,
    progressionInfo: `Greyskull LP: Reps +1`,
  };
}

/**
 * Double Progression: Increase reps until target, then jump weight and reset reps
 * E.g., 3×8 → 3×9 → 3×10 (hit target) → 3×(weight+2.5) → 3×8 again
 */
export function applyDoubleProgression(
  lastSet: WorkoutSet,
  targetReps: number = 12,
  repIncrement: number = 1,
  weightIncrement: number = 2.5
): ProgressedSet {
  // If reached target reps, increase weight and drop reps
  if (lastSet.reps >= targetReps) {
    return {
      ...lastSet,
      completed: false,
      suggestedWeight: Math.round((lastSet.weight + weightIncrement) * 10) / 10,
      suggestedReps: Math.max(1, targetReps - 4), // Reset to lower range
      progressionInfo: `Double Prog: Weight +${weightIncrement}kg, Reps reset`,
    };
  }

  // Otherwise increase reps
  return {
    ...lastSet,
    completed: false,
    suggestedWeight: lastSet.weight,
    suggestedReps: lastSet.reps + repIncrement,
    progressionInfo: `Double Prog: Reps +${repIncrement}`,
  };
}

/**
 * Apply progression rule to a set based on rule type
 */
export function applyProgression(
  lastSet: WorkoutSet,
  rule: ProgressionRule
): ProgressedSet {
  if (!rule.enabled) {
    return { ...lastSet, completed: false };
  }

  switch (rule.type) {
    case 'linear':
      return applyLinearProgression(lastSet, rule.weightIncrement || 2.5);
    case 'greyskull':
      return applyGreyskullProgression(lastSet);
    case 'double_progression':
      return applyDoubleProgression(
        lastSet,
        rule.targetReps || 12,
        rule.repIncrement || 1,
        rule.weightIncrement || 2.5
      );
    default:
      return { ...lastSet, completed: false };
  }
}

/**
 * Get progression suggestions for next workout
 */
export function getProgressionSuggestions(
  currentSets: WorkoutSet[],
  rule: ProgressionRule
): ProgressedSet[] {
  if (currentSets.length === 0) return [];

  // Use last set as reference (usually the hardest)
  const lastCompletedSet = [...currentSets]
    .reverse()
    .find((s) => s.completed);

  if (!lastCompletedSet) {
    return currentSets.map((s) => ({ ...s, completed: false }));
  }

  // Apply progression to all sets (they usually follow the same pattern)
  const progressed = applyProgression(lastCompletedSet, rule);

  // Return full set list with progression applied
  return currentSets.map((set, idx) => {
    if (idx === currentSets.length - 1) {
      // Last set gets the progression
      return progressed;
    }
    // Other sets scale proportionally (peso 0 = peso corporal: sin escalar)
    const ratio = lastCompletedSet.weight > 0 ? set.weight / lastCompletedSet.weight : 1;
    return {
      ...set,
      completed: false,
      suggestedWeight: Math.round((progressed.suggestedWeight! * ratio) * 10) / 10,
      suggestedReps: progressed.suggestedReps || set.reps,
    };
  });
}

/**
 * Prerrelleno de un ejercicio al empezar una sesión: con una regla activa, se
 * parte de lo que se hizo la última vez y se le aplica la progresión; sin regla
 * (o sin histórico), se devuelven los valores de la última vez tal cual.
 */
export function prefillWithProgression(
  baseSets: WorkoutSet[],
  lastSets: WorkoutSet[] | null,
  rule?: ProgressionRule
): WorkoutSet[] {
  if (!lastSets || lastSets.length === 0) return baseSets;

  const next = rule?.enabled ? progressSets(lastSets, rule) : lastSets;

  return baseSets.map((set, idx) => {
    const ref = next[idx] ?? next[next.length - 1];
    return { ...set, weight: ref.weight, reps: ref.reps };
  });
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Progresión serie a serie. En las reglas con dos fases (doble progresión y
// Greyskull) el peso solo sube cuando TODAS las series de trabajo han llegado
// al objetivo; mientras tanto, cada serie suma repeticiones por separado.
function progressSets(lastSets: WorkoutSet[], rule: ProgressionRule): WorkoutSet[] {
  const working = lastSets.filter((s) => !s.isWarmup);
  const reference = working.length > 0 ? working : lastSets;
  const allReach = (target: number) => reference.every((s) => s.reps >= target);
  const inc = rule.weightIncrement || 2.5;

  switch (rule.type) {
    case 'linear':
      return lastSets.map((s) => (s.isWarmup ? s : { ...s, weight: round1(s.weight + inc) }));

    case 'double_progression': {
      const target = rule.targetReps || 12;
      const repInc = rule.repIncrement || 1;
      if (allReach(target)) {
        const resetReps = Math.max(1, target - 4);
        return lastSets.map((s) => (s.isWarmup ? s : { ...s, weight: round1(s.weight + inc), reps: resetReps }));
      }
      return lastSets.map((s) => (s.isWarmup ? s : { ...s, reps: Math.min(target, s.reps + repInc) }));
    }

    case 'greyskull':
      if (allReach(5)) {
        return lastSets.map((s) => (s.isWarmup ? s : { ...s, weight: round1(s.weight + 2.5), reps: 3 }));
      }
      return lastSets.map((s) => (s.isWarmup ? s : { ...s, reps: Math.min(5, s.reps + 1) }));

    default:
      return lastSets;
  }
}

export const PROGRESSION_TYPE_LABEL: Record<ProgressionType, string> = {
  linear: 'Progresión lineal',
  greyskull: 'Greyskull LP',
  double_progression: 'Progresión doble',
};

export function defaultProgressionRule(exerciseId: string): ProgressionRule {
  return {
    exerciseId,
    type: 'double_progression',
    enabled: true,
    weightIncrement: 2.5,
    targetReps: 12,
    repIncrement: 1,
  };
}

/**
 * Get human-readable description of progression rule
 */
export function describeProgression(rule: ProgressionRule): string {
  switch (rule.type) {
    case 'linear':
      return `Progresión lineal: +${rule.weightIncrement || 2.5}kg por sesión`;
    case 'greyskull':
      return `Greyskull LP: Aumenta reps primero, luego peso`;
    case 'double_progression':
      return `Progresión doble: Aumenta reps hasta ${rule.targetReps}, luego +${rule.weightIncrement || 2.5}kg`;
    default:
      return 'Sin progresión';
  }
}

/**
 * Validate progression rule
 */
export function validateProgressionRule(rule: ProgressionRule): string[] {
  const errors: string[] = [];

  if (!rule.exerciseId) {
    errors.push('ID de ejercicio requerido');
  }

  if (rule.type === 'linear') {
    if (!rule.weightIncrement || rule.weightIncrement <= 0) {
      errors.push('Incremento de peso debe ser > 0');
    }
  }

  if (rule.type === 'double_progression') {
    if (!rule.targetReps || rule.targetReps <= 0) {
      errors.push('Reps objetivo debe ser > 0');
    }
    if (!rule.repIncrement || rule.repIncrement <= 0) {
      errors.push('Incremento de reps debe ser > 0');
    }
  }

  return errors;
}
