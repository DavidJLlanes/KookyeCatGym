import { MEALS, MealId } from '../../../utils/nutrition/types';

/** Selector compacto de comida para añadir al diario. */
export default function MealPicker({ value, onChange }: { value: MealId; onChange: (m: MealId) => void }) {
  return (
    <select aria-label="Comida" value={value} onChange={(e) => onChange(e.target.value as MealId)} className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100">
      {MEALS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
    </select>
  );
}
