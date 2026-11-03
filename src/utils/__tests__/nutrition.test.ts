import { describe, expect, it } from 'vitest';
import { bmr, dailyTargets, tdee } from '../nutrition/energy';
import { averageLogged, dayTotals, entryFromFood, lastDays, macrosForGrams, remaining, shiftDay } from '../nutrition/totals';
import { nutritionToCsv } from '../nutrition/csv';
import { sanitizeFoods, sanitizeLog, sanitizeProfile } from '../nutrition/sanitize';
import { DEFAULT_PROFILE, NutritionLog } from '../nutrition/types';
import { BASE_FOODS } from '../../data/foods';

describe('energía', () => {
  it('Mifflin-St Jeor: hombre 80 kg, 180 cm, 30 años = 1780 kcal', () => {
    expect(bmr('male', 80, 180, 30)).toBe(1780);
  });
  it('mujer 60 kg, 165 cm, 30 años = 1320 kcal', () => {
    expect(bmr('female', 60, 165, 30)).toBe(1320);
  });
  it('gasto total = basal × factor de actividad', () => {
    const p = { ...DEFAULT_PROFILE, heightCm: 180, age: 30, activity: 'moderate' as const };
    expect(tdee(p, 80)).toBe(Math.round(1780 * 1.55));
  });
  it('objetivo: proteína por kg, grasa por % y el resto hidratos', () => {
    const p = { ...DEFAULT_PROFILE, heightCm: 180, age: 30, proteinPerKg: 2, fatPercent: 25, adjustPercent: 0 };
    const t = dailyTargets(p, 80);
    expect(t.protein).toBe(160);
    expect(t.fat).toBe(Math.round((t.kcal * 0.25) / 9));
    expect(Math.abs(t.protein * 4 + t.carbs * 4 + t.fat * 9 - t.kcal)).toBeLessThan(10);
  });
  it('el déficit nunca baja del metabolismo basal', () => {
    const p = { ...DEFAULT_PROFILE, heightCm: 180, age: 30, activity: 'sedentary' as const, adjustPercent: -40 };
    const t = dailyTargets(p, 80);
    expect(t.kcal).toBe(t.bmr);
    expect(t.clampedToBmr).toBe(true);
  });
  it('día de descanso aplica su diferencia de calorías', () => {
    const p = { ...DEFAULT_PROFILE, restDayKcalDelta: -200 };
    expect(dailyTargets(p, 75, true).kcal - dailyTargets(p, 75, false).kcal).toBe(200);
  });
});

describe('totales', () => {
  const pollo = BASE_FOODS.find((f) => f.name === 'Pechuga de pollo')!;
  it('escala los macros por gramos', () => {
    const m = macrosForGrams(pollo, 200);
    expect(m.kcal).toBe(220);
    expect(m.protein).toBe(46);
  });
  it('suma un día y calcula lo que falta', () => {
    const day = { entries: [entryFromFood(pollo, 200, 'lunch', 'a'), entryFromFood(pollo, 100, 'dinner', 'b')], waterMl: 0 };
    const t = dayTotals(day);
    expect(t.protein).toBe(69);
    expect(remaining({ kcal: 2000, protein: 150, carbs: 200, fat: 60 }, t).protein).toBe(81);
  });
  it('shiftDay cruza fin de mes y de año', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('la media solo cuenta los días con registro', () => {
    const log: NutritionLog = {
      '2026-11-02': { entries: [entryFromFood(pollo, 100, 'lunch', 'a')], waterMl: 0 },
      '2026-11-03': { entries: [entryFromFood(pollo, 300, 'lunch', 'b')], waterMl: 0 },
    };
    const pts = lastDays(log, '2026-11-03', 7);
    expect(pts).toHaveLength(7);
    const avg = averageLogged(pts);
    expect(avg.days).toBe(2);
    expect(avg.kcal).toBe(220);
  });
});

describe('csv y validación', () => {
  it('el CSV usa ; y coma decimal', () => {
    const pollo = BASE_FOODS[0];
    const csv = nutritionToCsv({ '2026-11-03': { entries: [entryFromFood({ ...pollo, protein: 22.5 }, 100, 'lunch', 'a')], waterMl: 0 } });
    expect(csv.split('\n')[1]).toContain('22,5');
    expect(csv.split('\n')[1].split(';')[0]).toBe('2026-11-03');
  });
  it('descarta datos corruptos', () => {
    expect(sanitizeProfile({ sex: 'x' })).toBeNull();
    expect(sanitizeFoods([{ id: 'a', name: 'ok', kcal: 10, protein: 1, carbs: 1, fat: 1 }, { id: 'b', name: 'mal', kcal: -5 }])).toHaveLength(1);
    const log = sanitizeLog({ 'no-fecha': {}, '2026-11-03': { entries: [{ id: 'x', meal: 'lunch', name: 'ok', kcal: 1, protein: 1, carbs: 1, fat: 1 }, { id: 'y', meal: 'cena' }], waterMl: 500 } });
    expect(Object.keys(log)).toEqual(['2026-11-03']);
    expect(log['2026-11-03'].entries).toHaveLength(1);
  });
  it('el catálogo base tiene ids únicos y macros coherentes', () => {
    expect(new Set(BASE_FOODS.map((f) => f.id)).size).toBe(BASE_FOODS.length);
    // La cerveza y el vino llevan alcohol (7 kcal/g), que no sale de proteína, hidratos ni grasa
    for (const f of BASE_FOODS.filter((x) => !['Cerveza', 'Vino tinto'].includes(x.name))) {
      const kcal = f.protein * 4 + f.carbs * 4 + f.fat * 9;
      expect(Math.abs(kcal - f.kcal) / Math.max(f.kcal, 1)).toBeLessThan(0.35);
    }
  });
});
