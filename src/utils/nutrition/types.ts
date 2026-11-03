/** Tipos del módulo de nutrición (sin dependencias de React). */

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete';
export type NutritionGoal = 'lose' | 'hold' | 'gain';
export type MealId = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export const MEALS: { id: MealId; label: string }[] = [
  { id: 'breakfast', label: 'Desayuno' },
  { id: 'lunch', label: 'Comida' },
  { id: 'snack', label: 'Merienda' },
  { id: 'dinner', label: 'Cena' },
];

/** Macros y calorías de una cantidad concreta de comida. */
export interface Macros {
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

/** Datos personales y preferencias con las que se calculan los objetivos. */
export interface NutritionProfile {
  sex: Sex;
  age: number;
  heightCm: number;
  activity: ActivityLevel;
  goal: NutritionGoal;
  /** Ajuste de calorías sobre el gasto, en % (negativo = déficit). */
  adjustPercent: number;
  proteinPerKg: number; // g por kg de peso
  fatPercent: number; // % de las calorías
  /** Calorías de más o de menos en días sin entrenamiento (0 = igual). */
  restDayKcalDelta: number;
  waterGoalMl: number;
}

/** Alimento por 100 g (o por ración si `unit` es 'unit'). */
export interface Food extends Macros {
  id: string;
  name: string;
  /** Tamaño de una ración habitual en gramos (opcional). */
  servingG?: number;
  servingLabel?: string;
  custom?: boolean;
}

/** Una anotación del diario. Las cifras ya van calculadas para la cantidad comida. */
export interface LogEntry extends Macros {
  id: string;
  meal: MealId;
  name: string;
  grams?: number;
  foodId?: string;
}

export interface DayLog {
  entries: LogEntry[];
  waterMl: number;
}

export type NutritionLog = Record<string, DayLog>; // clave YYYY-MM-DD

export const EMPTY_DAY: DayLog = { entries: [], waterMl: 0 };

export const DEFAULT_PROFILE: NutritionProfile = {
  sex: 'male',
  age: 30,
  heightCm: 175,
  activity: 'moderate',
  goal: 'hold',
  adjustPercent: 0,
  proteinPerKg: 1.8,
  fatPercent: 25,
  restDayKcalDelta: 0,
  waterGoalMl: 2500,
};
