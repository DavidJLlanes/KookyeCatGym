import { ActivityLevel, DayLog, Food, LogEntry, MealId, NutritionGoal, NutritionLog, NutritionProfile } from './types';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MEAL_IDS: MealId[] = ['breakfast', 'lunch', 'snack', 'dinner'];
const ACTIVITIES: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'high', 'athlete'];
const GOALS: NutritionGoal[] = ['lose', 'hold', 'gain'];

const num = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null;
const str = (v: unknown, max = 120): string | null => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);

function macrosOf(o: any) {
  const kcal = num(o?.kcal, 0, 20000);
  const protein = num(o?.protein, 0, 2000);
  const carbs = num(o?.carbs, 0, 5000);
  const fat = num(o?.fat, 0, 2000);
  return kcal === null || protein === null || carbs === null || fat === null ? null : { kcal, protein, carbs, fat };
}

export function sanitizeProfile(raw: unknown): NutritionProfile | null {
  const p = raw as any;
  if (!p || typeof p !== 'object') return null;
  const age = num(p.age, 10, 100);
  const heightCm = num(p.heightCm, 100, 250);
  if (age === null || heightCm === null || !['male', 'female'].includes(p.sex)) return null;
  return {
    sex: p.sex,
    age,
    heightCm,
    activity: ACTIVITIES.includes(p.activity) ? p.activity : 'moderate',
    goal: GOALS.includes(p.goal) ? p.goal : 'hold',
    adjustPercent: num(p.adjustPercent, -40, 40) ?? 0,
    proteinPerKg: num(p.proteinPerKg, 0.8, 3.5) ?? 1.8,
    fatPercent: num(p.fatPercent, 10, 50) ?? 25,
    restDayKcalDelta: num(p.restDayKcalDelta, -1500, 1500) ?? 0,
    waterGoalMl: num(p.waterGoalMl, 500, 10000) ?? 2500,
  };
}

export function sanitizeFoods(raw: unknown): Food[] {
  if (!Array.isArray(raw)) return [];
  const out: Food[] = [];
  const seen = new Set<string>();
  for (const f of raw as any[]) {
    const id = str(f?.id, 60);
    const name = str(f?.name);
    const m = macrosOf(f);
    if (!id || !name || !m || seen.has(id)) continue;
    seen.add(id);
    const servingG = num(f.servingG, 1, 5000);
    out.push({
      id,
      name,
      ...m,
      custom: true,
      ...(servingG !== null ? { servingG } : {}),
      ...(servingG !== null && str(f.servingLabel, 40) ? { servingLabel: str(f.servingLabel, 40)! } : {}),
    });
  }
  return out;
}

export function sanitizeLog(raw: unknown): NutritionLog {
  const out: NutritionLog = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [date, d] of Object.entries(raw as Record<string, any>)) {
    if (!DAY.test(date) || !d || typeof d !== 'object') continue;
    const entries: LogEntry[] = [];
    for (const e of Array.isArray(d.entries) ? d.entries : []) {
      const id = str(e?.id, 60);
      const name = str(e?.name);
      const m = macrosOf(e);
      if (!id || !name || !m || !MEAL_IDS.includes(e.meal)) continue;
      const grams = num(e.grams, 0, 20000);
      entries.push({
        id,
        meal: e.meal,
        name,
        ...m,
        ...(grams !== null ? { grams } : {}),
        ...(str(e.foodId, 60) ? { foodId: str(e.foodId, 60)! } : {}),
      });
    }
    const day: DayLog = { entries, waterMl: num(d.waterMl, 0, 20000) ?? 0 };
    if (day.entries.length > 0 || day.waterMl > 0) out[date] = day;
  }
  return out;
}
