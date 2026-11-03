import { useState } from 'react';
import { Apple } from 'lucide-react';
import { Food } from '../../utils/nutrition/types';
import ModalShell from './ModalShell';

interface FoodEditorProps {
  isOpen: boolean;
  /** Alimento a editar; null = nuevo. */
  food: Food | null;
  onClose: () => void;
  onSave: (food: Omit<Food, 'id' | 'custom'> & { id?: string }) => void;
}

const toNum = (v: string) => Number(v.replace(',', '.'));
const text = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','));
const input = 'w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500';

/** Crear o editar un alimento propio (valores por 100 g, como en la etiqueta). */
export default function FoodEditor({ isOpen, food, onClose, onSave }: FoodEditorProps) {
  const [f, setF] = useState({
    name: food?.name ?? '',
    kcal: text(food?.kcal),
    protein: text(food?.protein),
    carbs: text(food?.carbs),
    fat: text(food?.fat),
    servingG: text(food?.servingG),
    servingLabel: food?.servingLabel ?? '',
  });
  const set = (k: keyof typeof f, v: string) => setF((prev) => ({ ...prev, [k]: v }));
  const valid = f.name.trim() && f.kcal !== '' && toNum(f.kcal) >= 0;

  const save = () => {
    if (!valid) return;
    const serving = toNum(f.servingG);
    onSave({
      ...(food ? { id: food.id } : {}),
      name: f.name.trim(),
      kcal: Math.round(toNum(f.kcal)),
      protein: toNum(f.protein) || 0,
      carbs: toNum(f.carbs) || 0,
      fat: toNum(f.fat) || 0,
      ...(serving > 0 ? { servingG: serving, ...(f.servingLabel.trim() ? { servingLabel: f.servingLabel.trim() } : {}) } : {}),
    });
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      title={food ? 'Editar alimento' : 'Nuevo alimento'}
      icon={<Apple className="h-5 w-5 text-emerald-400" />}
      onClose={onClose}
      footer={<button type="button" id="btn-save-food" disabled={!valid} onClick={save} className="btn btn-primary w-full disabled:opacity-40">Guardar alimento</button>}
    >
      <label className="block space-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        Nombre
        <input value={f.name} onChange={(e) => set('name', e.target.value)} className={input} placeholder="Ej. Yogur de la marca X" />
      </label>
      <p className="text-xs text-slate-500">Valores por cada 100 g, como aparecen en la etiqueta.</p>
      <div className="grid grid-cols-2 gap-3">
        {([['kcal', 'Calorías'], ['protein', 'Proteína (g)'], ['carbs', 'Hidratos (g)'], ['fat', 'Grasa (g)']] as const).map(([k, l]) => (
          <label key={k} className="space-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {l}
            <input inputMode="decimal" value={f[k]} onChange={(e) => set(k, e.target.value)} className={input} />
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Ración (g, opcional)
          <input inputMode="decimal" value={f.servingG} onChange={(e) => set('servingG', e.target.value)} className={input} placeholder="125" />
        </label>
        <label className="space-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Nombre de la ración
          <input value={f.servingLabel} onChange={(e) => set('servingLabel', e.target.value)} className={input} placeholder="yogur" />
        </label>
      </div>
    </ModalShell>
  );
}
