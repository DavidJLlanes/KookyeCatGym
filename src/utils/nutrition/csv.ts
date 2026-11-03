import { MEALS, NutritionLog } from './types';

const label = Object.fromEntries(MEALS.map((m) => [m.id, m.label]));
const esc = (v: string | number) => {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Diario completo en CSV (separador `;` y coma decimal, para abrirlo directo en Excel en español). */
export function nutritionToCsv(log: NutritionLog): string {
  const num = (n: number) => String(n).replace('.', ',');
  const rows = ['Fecha;Comida;Alimento;Gramos;Calorías;Proteína (g);Hidratos (g);Grasa (g)'];
  for (const date of Object.keys(log).sort()) {
    for (const e of log[date].entries) {
      rows.push([date, label[e.meal], esc(e.name), e.grams ?? '', e.kcal, num(e.protein), num(e.carbs), num(e.fat)].join(';'));
    }
  }
  return rows.join('\n');
}
