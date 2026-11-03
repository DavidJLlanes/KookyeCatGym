import { useMemo, useState } from 'react';
import { Search, Utensils } from 'lucide-react';
import { Food, LogEntry, MEALS, MealId } from '../../utils/nutrition/types';
import { macrosForGrams } from '../../utils/nutrition/totals';
import ModalShell from './ModalShell';

interface AddFoodModalProps {
  isOpen: boolean;
  meal: MealId;
  foods: Food[];
  onClose: () => void;
  onAddFood: (food: Food, grams: number, meal: MealId) => void;
  onAddManual: (entry: Omit<LogEntry, 'id'>) => void;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const toNum = (v: string) => Number(v.replace(',', '.'));

/** Añadir al diario: buscar un alimento y la cantidad, o escribir las cifras a mano. */
export default function AddFoodModal({ isOpen, meal: initialMeal, foods, onClose, onAddFood, onAddManual }: AddFoodModalProps) {
  const [mode, setMode] = useState<'food' | 'manual'>('food');
  const [meal, setMeal] = useState<MealId>(initialMeal);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');
  const [manual, setManual] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });

  const results = useMemo(() => {
    const q = norm(query.trim());
    return (q ? foods.filter((f) => norm(f.name).includes(q)) : foods).slice(0, 40);
  }, [foods, query]);

  // Al abrir con otra comida distinta, se actualiza
  const reset = () => {
    setPicked(null);
    setQuery('');
    setGrams('100');
    setManual({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
  };
  const close = () => {
    reset();
    onClose();
  };

  const g = toNum(grams);
  const preview = picked && g > 0 ? macrosForGrams(picked, g) : null;
  const manualValid = manual.name.trim() && toNum(manual.kcal) >= 0 && manual.kcal !== '';

  const submit = () => {
    if (mode === 'food' && picked && g > 0) {
      onAddFood(picked, g, meal);
    } else if (mode === 'manual' && manualValid) {
      onAddManual({
        meal,
        name: manual.name.trim(),
        kcal: Math.round(toNum(manual.kcal)),
        protein: toNum(manual.protein) || 0,
        carbs: toNum(manual.carbs) || 0,
        fat: toNum(manual.fat) || 0,
      });
    } else return;
    close();
  };

  const canSubmit = mode === 'food' ? !!picked && g > 0 : !!manualValid;
  const input = 'w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <ModalShell
      isOpen={isOpen}
      title="Añadir al diario"
      icon={<Utensils className="h-5 w-5 text-emerald-400" />}
      onClose={close}
      footer={
        <button type="button" id="btn-nutrition-confirm-add" disabled={!canSubmit} onClick={submit} className="btn btn-primary w-full disabled:opacity-40">
          Añadir{preview ? ` · ${preview.kcal} kcal` : ''}
        </button>
      }
    >
      <div className="flex gap-2">
        {MEALS.map((m) => (
          <button key={m.id} type="button" onClick={() => setMeal(m.id)} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${meal === m.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
        {(['food', 'manual'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer ${mode === m ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>
            {m === 'food' ? 'Buscar alimento' : 'Cifras a mano'}
          </button>
        ))}
      </div>

      {mode === 'food' ? (
        <>
          <div className="relative">
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar (pollo, arroz, yogur…)" className={`${input} pl-9`} aria-label="Buscar alimento" />
          </div>
          <ul className="max-h-56 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl">
            {results.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(f);
                    setGrams(String(f.servingG ?? 100));
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex justify-between gap-3 cursor-pointer ${picked?.id === f.id ? 'bg-blue-950/50' : 'hover:bg-slate-800/60'}`}
                >
                  <span className="text-slate-200 truncate">{f.name}{f.custom && <span className="ml-1.5 text-[10px] text-emerald-400 font-bold">TUYO</span>}</span>
                  <span className="text-xs text-slate-500 tabular-nums shrink-0">{f.kcal} kcal/100 g</span>
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="px-3 py-4 text-xs text-slate-500 text-center">No hay coincidencias. Crea tu alimento en la pestaña Alimentos o usa «Cifras a mano».</li>}
          </ul>
          {picked && (
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Cantidad (g){picked.servingG ? ` · 1 ${picked.servingLabel ?? 'ración'} = ${picked.servingG} g` : ''}
              </label>
              <input inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} className={input} aria-label="Gramos" />
              {preview && (
                <p className="text-xs text-slate-400 tabular-nums">
                  {preview.kcal} kcal · P {preview.protein} g · H {preview.carbs} g · G {preview.fat} g
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 space-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Nombre
            <input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} className={input} placeholder="Ej. Menú del día" />
          </label>
          {([['kcal', 'Calorías'], ['protein', 'Proteína (g)'], ['carbs', 'Hidratos (g)'], ['fat', 'Grasa (g)']] as const).map(([k, l]) => (
            <label key={k} className="space-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {l}
              <input inputMode="decimal" value={manual[k]} onChange={(e) => setManual({ ...manual, [k]: e.target.value })} className={input} />
            </label>
          ))}
        </div>
      )}
    </ModalShell>
  );
}
