import { WorkoutLog, Exercise } from '../types';

export interface MuscleBalance {
  muscle1: string;
  muscle2: string;
  ratio: number;
  status: 'balanced' | 'warning' | 'critical';
  // 'low': muscle1 se queda corto respecto a muscle2; 'high': lo supera de más
  direction: 'low' | 'high' | null;
  minRatio: number;
  maxRatio: number;
  // Ejercicio y 1RM estimado usados en cada lado, p. ej. "Press de banca con barra · 100 kg"
  detail1: string;
  detail2: string;
}

const LOOKBACK_DAYS = 180;
// El 1RM estimado solo es fiable con series de pocas repeticiones
const MAX_REPS_FOR_ESTIMATE = 12;

type Lift = 'bench' | 'squat' | 'deadlift' | 'row' | 'ohp' | 'legCurl' | 'legExtension';

interface LiftRule {
  label: string;
  equipment: Exercise['equipment'];
  include: RegExp;
  exclude?: RegExp;
}

// Se compara solo con barra (o máquina en femoral/cuádriceps): mezclar
// mancuernas, poleas o variantes muy distintas falsearía los ratios.
// Nombres en español (biblioteca) y en inglés (ejercicios importados de otras apps).
const LIFTS: Record<Lift, LiftRule> = {
  bench: {
    label: 'Press de banca',
    equipment: 'Barra',
    include: /press de banca|bench press/,
    exclude: /inclinad|declinad|cerrad|guillotina|invertid|\bjm\b|\bez\b|incline|decline|close/,
  },
  squat: {
    label: 'Sentadilla',
    equipment: 'Barra',
    include: /sentadilla|^squat|back squat|squat \(barbell\)/,
    exclude: /salto|hack|frankenstein|velocidad|overhead|dividida|split|lateral|frontal|zercher|rodillas|jefferson|una pierna|banco|pies juntos|cargada|zancada|front|bulgarian|jump/,
  },
  deadlift: {
    label: 'Peso muerto',
    equipment: 'Barra',
    include: /peso muerto|deadlift/,
    exclude: /lateral|una pierna|una mano|rigidas|rumano|sumo|hexagonal|romanian|stiff|single|trap bar|hex/,
  },
  row: {
    label: 'Remo',
    equipment: 'Barra',
    include: /remo|row/,
    exclude: /menton|una mano|deltoides|banco inclinado|maquina|tumbado|cambered|upright|one arm|single/,
  },
  ohp: {
    label: 'Press militar',
    equipment: 'Barra',
    include: /press militar|overhead press|military press|shoulder press \(barbell\)/,
  },
  legCurl: {
    label: 'Curl femoral',
    equipment: 'Máquina',
    include: /curl femoral|curl de piernas|leg curl|hamstring curl/,
    exclude: /invers|invertid|arrodillado|nordic/,
  },
  legExtension: {
    label: 'Extensión de cuádriceps',
    equipment: 'Máquina',
    include: /extension de (piernas|cuadriceps)|leg extension/,
  },
};

interface RatioRule {
  top: Lift;
  bottom: Lift;
  muscle1: string;
  muscle2: string;
  minRatio: number;
  maxRatio: number;
}

// Rangos orientativos habituales de equilibrio estructural
const RATIOS: RatioRule[] = [
  { top: 'bench', bottom: 'squat', muscle1: 'Pecho (press de banca)', muscle2: 'Piernas (sentadilla)', minRatio: 0.6, maxRatio: 0.8 },
  { top: 'deadlift', bottom: 'squat', muscle1: 'Cadena posterior (peso muerto)', muscle2: 'Piernas (sentadilla)', minRatio: 1.0, maxRatio: 1.3 },
  { top: 'row', bottom: 'bench', muscle1: 'Espalda (remo)', muscle2: 'Pecho (press de banca)', minRatio: 0.7, maxRatio: 1.0 },
  { top: 'ohp', bottom: 'bench', muscle1: 'Hombros (press militar)', muscle2: 'Pecho (press de banca)', minRatio: 0.5, maxRatio: 0.7 },
  { top: 'legCurl', bottom: 'legExtension', muscle1: 'Isquiotibiales (curl femoral)', muscle2: 'Cuádriceps (extensión)', minRatio: 0.6, maxRatio: 0.8 },
];

export const BALANCE_LIFT_LABELS = Object.values(LIFTS).map((l) => l.label);

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const epley = (weight: number, reps: number) => weight * (1 + reps / 30);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Mejor 1RM estimado por ejercicio en los últimos meses (series completadas, sin calentamiento). */
function bestEstimatesByExercise(logs: WorkoutLog[]): Map<string, number> {
  const cutoff = Date.now() - LOOKBACK_DAYS * 86400000;
  const best = new Map<string, number>();
  for (const log of logs) {
    if (new Date(log.date).getTime() < cutoff) continue;
    for (const we of log.exercises) {
      for (const set of we.sets) {
        if (!set.completed || set.isWarmup || set.weight <= 0 || set.reps < 1 || set.reps > MAX_REPS_FOR_ESTIMATE) continue;
        const e1rm = epley(set.weight, set.reps);
        if (e1rm > (best.get(we.exerciseId) ?? 0)) best.set(we.exerciseId, e1rm);
      }
    }
  }
  return best;
}

/** El ejercicio de esa categoría que más fuerza muestra (el que de verdad entrenas). */
function strongestLift(rule: LiftRule, exercises: Exercise[], best: Map<string, number>) {
  let result: { name: string; e1rm: number } | null = null;
  for (const ex of exercises) {
    const e1rm = best.get(ex.id);
    if (!e1rm || ex.equipment !== rule.equipment) continue;
    const name = normalize(ex.name);
    if (!rule.include.test(name) || rule.exclude?.test(name)) continue;
    if (!result || e1rm > result.e1rm) result = { name: ex.name, e1rm };
  }
  return result;
}

function evaluate(rule: RatioRule, top: { name: string; e1rm: number }, bottom: { name: string; e1rm: number }): MuscleBalance {
  const ratio = top.e1rm / bottom.e1rm;
  const width = rule.maxRatio - rule.minRatio;
  // Fuera del rango por poco = advertencia; por más de la mitad del rango = crítico
  let status: MuscleBalance['status'] = 'balanced';
  let direction: MuscleBalance['direction'] = null;
  if (ratio < rule.minRatio) {
    direction = 'low';
    status = rule.minRatio - ratio > width / 2 ? 'critical' : 'warning';
  } else if (ratio > rule.maxRatio) {
    direction = 'high';
    status = ratio - rule.maxRatio > width / 2 ? 'critical' : 'warning';
  }
  return {
    muscle1: rule.muscle1,
    muscle2: rule.muscle2,
    ratio: Math.round(ratio * 100) / 100,
    status,
    direction,
    minRatio: rule.minRatio,
    maxRatio: rule.maxRatio,
    detail1: `${top.name} · ${round1(top.e1rm)} kg`,
    detail2: `${bottom.name} · ${round1(bottom.e1rm)} kg`,
  };
}

/**
 * Ratios de equilibrio con los ejercicios que has entrenado en los últimos
 * meses. Solo se incluyen los ratios de los que hay datos en ambos lados.
 */
export function calculateAllBalances(logs: WorkoutLog[], exercises: Exercise[]): MuscleBalance[] {
  const best = bestEstimatesByExercise(logs);
  const lifts = {} as Record<Lift, { name: string; e1rm: number } | null>;
  (Object.keys(LIFTS) as Lift[]).forEach((lift) => {
    lifts[lift] = strongestLift(LIFTS[lift], exercises, best);
  });

  return RATIOS.flatMap((rule) => {
    const top = lifts[rule.top];
    const bottom = lifts[rule.bottom];
    return top && bottom ? [evaluate(rule, top, bottom)] : [];
  });
}

export function getBalanceRecommendation(balance: MuscleBalance): string {
  if (balance.status === 'balanced') {
    return 'Equilibrado: mantén el trabajo de ambos.';
  }
  if (balance.direction === 'low') {
    return `${balance.muscle1} se queda corto frente a ${balance.muscle2}. Dale más prioridad a ${balance.muscle1}.`;
  }
  return `${balance.muscle1} supera de más a ${balance.muscle2}. Refuerza ${balance.muscle2}.`;
}

export function getBalanceStatusColor(status: 'balanced' | 'warning' | 'critical'): string {
  switch (status) {
    case 'balanced':
      return '#10b981'; // green
    case 'warning':
      return '#f59e0b'; // amber
    case 'critical':
      return '#ef4444'; // red
  }
}
