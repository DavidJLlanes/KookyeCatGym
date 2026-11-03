import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { useNutritionAi } from '../../../hooks/useNutritionAi';
import { EstimatedFood, entryFromEstimate } from '../../../utils/nutrition/ai';
import { MealId } from '../../../utils/nutrition/types';
import type { NutritionData } from '../../../hooks/useNutritionData';
import AiShell from './AiShell';
import MealPicker from './MealPicker';

const field = 'w-16 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 text-right tabular-nums';

/** Describe una comida con palabras; la IA estima los macros y tú los revisas antes de guardar. */
export default function EstimatePanel({ date, data }: { date: string; data: NutritionData }) {
  const { result, loading, error, run, reset } = useNutritionAi('estimate');
  const [text, setText] = useState('');
  const [meal, setMeal] = useState<MealId>('lunch');
  const [items, setItems] = useState<EstimatedFood[] | null>(null);
  const [added, setAdded] = useState(false);

  const estimate = async () => {
    setItems(null);
    setAdded(false);
    await run({ text });
  };
  // Al llegar el resultado se copia a un estado editable
  if (result && items === null) setItems(result.alimentos);

  const edit = (i: number, key: keyof EstimatedFood, value: string) =>
    setItems((cur) => cur && cur.map((f, idx) => (idx === i ? { ...f, [key]: key === 'name' ? value : Math.max(0, Number(value.replace(',', '.')) || 0) } : f)));

  const addAll = () => {
    items?.forEach((f) => data.addEntry(date, entryFromEstimate(f, meal)));
    setAdded(true);
    setItems(null);
    reset();
    setText('');
  };

  return (
    <AiShell id="ai-estimate" title="Estimar una comida" description="Escribe lo que has comido («dos huevos revueltos con pan y un café con leche»). Revisa las cifras antes de guardar." loading={loading} error={error} meta={items ? result : null}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={600} placeholder="¿Qué has comido?" className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
      <button type="button" id="btn-ai-estimate" disabled={loading || !text.trim()} onClick={estimate} className="btn btn-primary btn-sm disabled:opacity-40">Estimar</button>
      {added && <p className="text-xs text-emerald-400 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Añadido al diario</p>}
      {items && (
        <div className="space-y-2">
          {result?.nota && <p className="text-xs text-slate-400">{result.nota}</p>}
          <div className="space-y-2">
            {items.map((f, i) => (
              <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <input aria-label="Nombre" value={f.name} onChange={(e) => edit(i, 'name', e.target.value)} className="flex-1 min-w-0 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-sm text-slate-100" />
                  <button type="button" aria-label="Quitar" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                  {([['grams', 'g'], ['kcal', 'kcal'], ['protein', 'P'], ['carbs', 'H'], ['fat', 'G']] as const).map(([k, l]) => (
                    <label key={k} className="flex items-center gap-1">{l}<input aria-label={l} inputMode="decimal" value={f[k]} onChange={(e) => edit(i, k, e.target.value)} className={field} /></label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <MealPicker value={meal} onChange={setMeal} />
            <button type="button" id="btn-ai-estimate-add" disabled={items.length === 0} onClick={addAll} className="btn btn-primary btn-sm disabled:opacity-40">Añadir al diario</button>
          </div>
        </div>
      )}
    </AiShell>
  );
}
