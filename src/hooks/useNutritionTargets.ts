import { useMemo } from 'react';
import { useUserData } from '../context/UserDataContext';
import { WorkoutLog } from '../types';
import { dailyTargets, NutritionTargets } from '../utils/nutrition/energy';
import { NutritionProfile } from '../utils/nutrition/types';
import { localDayKey } from '../utils/userData';

/** Peso más reciente registrado (kg) o null si aún no hay ninguno. */
export function latestWeightKg(weights: { date: string; kg: number }[]): number | null {
  return weights.length > 0 ? weights[weights.length - 1].kg : null;
}

/**
 * Objetivos del día: usan el último peso corporal y distinguen días con y sin
 * entrenamiento (según el historial de la app).
 */
export function useNutritionTargets(profile: NutritionProfile | null, logs: WorkoutLog[], date: string) {
  const { data } = useUserData();
  const weightKg = latestWeightKg(data['body-weights']);

  const trainingDays = useMemo(() => new Set(logs.map((l) => localDayKey(new Date(l.date)))), [logs]);
  const isTrainingDay = trainingDays.has(date);

  const targets: NutritionTargets | null = useMemo(
    () => (profile && weightKg ? dailyTargets(profile, weightKg, isTrainingDay) : null),
    [profile, weightKg, isTrainingDay]
  );

  return { targets, weightKg, isTrainingDay };
}
