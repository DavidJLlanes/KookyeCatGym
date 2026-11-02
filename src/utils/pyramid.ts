import type { WorkoutSet } from '../types';

export type PyramidDirection = 'up' | 'down';

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/**
 * Pirámide a partir de una serie base:
 *  - 'up' (ascendente): cada serie con más peso y menos repeticiones.
 *  - 'down' (descendente): el orden contrario; más peso y menos reps primero.
 * Los descansos crecen con el peso (más pesado, más descanso). La serie base
 * es la del extremo ligero (la de más repeticiones).
 */
export function buildPyramid(
  base: Pick<WorkoutSet, 'weight' | 'reps'>,
  baseRest: number,
  direction: PyramidDirection,
  steps = 4,
  makeId: (i: number) => string = (i) => `set-pyr-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`
): WorkoutSet[] {
  const n = Math.max(2, Math.min(8, Math.round(steps)));
  const ascending: WorkoutSet[] = Array.from({ length: n }, (_, i) => {
    const weight = base.weight > 0 ? Math.max(0, roundTo(base.weight * (1 + 0.1 * i), 2.5)) : 0;
    const reps = Math.max(1, base.reps - 2 * i);
    const restTime = Math.min(900, Math.round(baseRest + 15 * i));
    return { id: '', weight, reps, completed: false, restTime };
  });
  const ordered = direction === 'up' ? ascending : [...ascending].reverse();
  return ordered.map((s, i) => ({ ...s, id: makeId(i) }));
}
