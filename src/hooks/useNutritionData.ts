import { useMemo, useRef } from 'react';
import { useUserData } from '../context/UserDataContext';
import { BASE_FOODS } from '../data/foods';
import { DayLog, EMPTY_DAY, Food, LogEntry, MealId, NutritionLog, NutritionProfile } from '../utils/nutrition/types';
import { cloneEntries, entryFromFood, shiftDay } from '../utils/nutrition/totals';

let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * Datos de nutrición del usuario (perfil, alimentos propios y diario) y las
 * acciones para cambiarlos. Todo se guarda en `userdata`, así que se
 * sincroniza entre dispositivos y funciona sin conexión.
 */
export function useNutritionData() {
  const { data, setValue } = useUserData();
  const profile = data['nutrition-profile'];
  const customFoods = data['nutrition-foods'];
  const log = data['nutrition-log'];
  // Última versión del diario, también entre dos escrituras seguidas antes de volver a pintar
  const logRef = useRef(log);
  logRef.current = log;

  /** Catálogo completo: primero los propios, luego los básicos. */
  const allFoods = useMemo<Food[]>(() => [...customFoods, ...BASE_FOODS], [customFoods]);

  const saveProfile = (p: NutritionProfile) => setValue('nutrition-profile', p);

  const writeDay = (date: string, update: (day: DayLog) => DayLog) => {
    const current = logRef.current;
    const next: NutritionLog = { ...current };
    const day = update(current[date] ?? EMPTY_DAY);
    if (day.entries.length === 0 && day.waterMl === 0) delete next[date];
    else next[date] = day;
    logRef.current = next;
    setValue('nutrition-log', next);
  };

  const addEntry = (date: string, entry: Omit<LogEntry, 'id'>) =>
    writeDay(date, (d) => ({ ...d, entries: [...d.entries, { ...entry, id: uid('e') }] }));

  const addFoodEntry = (date: string, food: Food, grams: number, meal: MealId) =>
    writeDay(date, (d) => ({ ...d, entries: [...d.entries, entryFromFood(food, grams, meal, uid('e'))] }));

  const removeEntry = (date: string, id: string) => writeDay(date, (d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));

  const addWater = (date: string, ml: number) => writeDay(date, (d) => ({ ...d, waterMl: Math.max(0, d.waterMl + ml) }));

  /** Copia al día indicado todas las anotaciones del día anterior. */
  const copyFromYesterday = (date: string) => {
    const source = log[shiftDay(date, -1)];
    if (!source || source.entries.length === 0) return 0;
    writeDay(date, (d) => ({ ...d, entries: [...d.entries, ...cloneEntries(source.entries, () => uid('e'))] }));
    return source.entries.length;
  };

  const saveFood = (food: Omit<Food, 'id' | 'custom'> & { id?: string }) => {
    const id = food.id ?? uid('f');
    const next: Food = { ...food, id, custom: true };
    setValue('nutrition-foods', [...customFoods.filter((f) => f.id !== id), next]);
    return next;
  };

  const deleteFood = (id: string) => setValue('nutrition-foods', customFoods.filter((f) => f.id !== id));

  return {
    profile, saveProfile, customFoods, allFoods, log,
    addEntry, addFoodEntry, removeEntry, addWater, copyFromYesterday, saveFood, deleteFood,
  };
}

export type NutritionData = ReturnType<typeof useNutritionData>;
