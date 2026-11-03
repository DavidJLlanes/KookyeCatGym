import { DayLog, Food, LogEntry, Macros, MealId, NutritionLog, EMPTY_DAY } from './types';

const r1 = (n: number) => Math.round(n * 10) / 10;

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/** Calorías y macros de `grams` gramos de un alimento (guardado por 100 g). */
export function macrosForGrams(food: Macros, grams: number): Macros {
  const k = grams / 100;
  return { kcal: Math.round(food.kcal * k), protein: r1(food.protein * k), carbs: r1(food.carbs * k), fat: r1(food.fat * k) };
}

/** Crea la anotación del diario para una cantidad de un alimento. */
export function entryFromFood(food: Food, grams: number, meal: MealId, id: string): LogEntry {
  return { id, meal, name: food.name, grams, foodId: food.id, ...macrosForGrams(food, grams) };
}

export function sumMacros(items: Macros[]): Macros {
  const t = items.reduce(
    (acc, m) => ({ kcal: acc.kcal + m.kcal, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat }),
    { ...ZERO_MACROS }
  );
  return { kcal: Math.round(t.kcal), protein: r1(t.protein), carbs: r1(t.carbs), fat: r1(t.fat) };
}

export function dayTotals(day: DayLog | undefined): Macros {
  return sumMacros((day ?? EMPTY_DAY).entries);
}

/** Lo que falta (o sobra, en negativo) para llegar al objetivo. */
export function remaining(target: Macros, eaten: Macros): Macros {
  return {
    kcal: Math.round(target.kcal - eaten.kcal),
    protein: r1(target.protein - eaten.protein),
    carbs: r1(target.carbs - eaten.carbs),
    fat: r1(target.fat - eaten.fat),
  };
}

export function entriesByMeal(day: DayLog | undefined, meal: MealId): LogEntry[] {
  return (day ?? EMPTY_DAY).entries.filter((e) => e.meal === meal);
}

/** Fecha YYYY-MM-DD desplazada `delta` días (en hora local). */
export function shiftDay(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export interface WeekPoint extends Macros {
  date: string;
  logged: boolean;
}

/** Los `days` días que terminan en `endDay`, del más antiguo al más reciente. */
export function lastDays(log: NutritionLog, endDay: string, days = 7): WeekPoint[] {
  const out: WeekPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftDay(endDay, -i);
    const day = log[date];
    out.push({ date, logged: !!day && day.entries.length > 0, ...dayTotals(day) });
  }
  return out;
}

/** Media de los días con algo registrado (los vacíos no cuentan). */
export function averageLogged(points: WeekPoint[]): (Macros & { days: number }) {
  const used = points.filter((p) => p.logged);
  if (used.length === 0) return { ...ZERO_MACROS, days: 0 };
  const s = sumMacros(used);
  const n = used.length;
  return { kcal: Math.round(s.kcal / n), protein: r1(s.protein / n), carbs: r1(s.carbs / n), fat: r1(s.fat / n), days: n };
}

/** Anotaciones de un día para copiarlas a otro, con ids nuevos. */
export function cloneEntries(entries: LogEntry[], newId: (i: number) => string): LogEntry[] {
  return entries.map((e, i) => ({ ...e, id: newId(i) }));
}
