import { ActivityLevel, Macros, NutritionGoal, NutritionProfile } from './types';

/** Factores de actividad habituales para estimar el gasto diario total. */
export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  athlete: 1.9,
};

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario (poco o nada de ejercicio)',
  light: 'Ligero (1-3 días de ejercicio)',
  moderate: 'Moderado (3-5 días)',
  high: 'Alto (6-7 días)',
  athlete: 'Muy alto (entreno doble o trabajo físico)',
};

/** Ajuste de calorías que se sugiere al elegir objetivo (editable por el usuario). */
export const GOAL_DEFAULT_ADJUST: Record<NutritionGoal, number> = { lose: -15, hold: 0, gain: 10 };

/** Metabolismo basal con la ecuación de Mifflin-St Jeor (kcal/día). */
export function bmr(sex: 'male' | 'female', weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(base + (sex === 'male' ? 5 : -161));
}

/** Gasto diario total estimado (kcal/día). */
export function tdee(profile: NutritionProfile, weightKg: number): number {
  return Math.round(bmr(profile.sex, weightKg, profile.heightCm, profile.age) * ACTIVITY_FACTOR[profile.activity]);
}

export interface NutritionTargets extends Macros {
  bmr: number;
  tdee: number;
  /** true si se subió al mínimo (metabolismo basal) porque el objetivo quedaba por debajo. */
  clampedToBmr: boolean;
}

/**
 * Objetivo diario de calorías y macros. Las calorías nunca bajan del
 * metabolismo basal; la proteína se fija por kg, la grasa por % de las
 * calorías y los hidratos son el resto.
 */
export function dailyTargets(profile: NutritionProfile, weightKg: number, isTrainingDay = true): NutritionTargets {
  const basal = bmr(profile.sex, weightKg, profile.heightCm, profile.age);
  const total = tdee(profile, weightKg);
  let kcal = total * (1 + profile.adjustPercent / 100) + (isTrainingDay ? 0 : profile.restDayKcalDelta);
  const clampedToBmr = kcal < basal;
  if (clampedToBmr) kcal = basal;
  kcal = Math.round(kcal);

  const protein = Math.round(profile.proteinPerKg * weightKg);
  const fat = Math.round((kcal * (profile.fatPercent / 100)) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat, bmr: basal, tdee: total, clampedToBmr };
}
