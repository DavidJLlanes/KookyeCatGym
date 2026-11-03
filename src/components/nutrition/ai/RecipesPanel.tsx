import { useState } from 'react';
import { ChefHat, Clock, Plus } from 'lucide-react';
import { useNutritionAi } from '../../../hooks/useNutritionAi';
import { entryFromRecipe, parseFoodList, Recipe } from '../../../utils/nutrition/ai';
import { Macros, MealId } from '../../../utils/nutrition/types';
import type { NutritionData } from '../../../hooks/useNutritionData';
import AiShell from './AiShell';
import MealPicker from './MealPicker';

interface RecipesPanelProps {
  date: string;
  data: NutritionData;
  /** Macros que te quedan hoy (null si aún no hay objetivos). */
  remaining: Macros | null;
}

function RecipeCard({ recipe, onAdd }: { recipe: Recipe; onAdd: (meal: MealId) => void }) {
  const [meal, setMeal] = useState<MealId>('dinner');
  const m = recipe.porRacion;
  return (
    <article className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
      <h4 className="font-black text-white text-sm flex items-center gap-2"><ChefHat className="h-4 w-4 text-amber-400" /> {recipe.titulo}</h4>
      <p className="text-[11px] text-slate-400 flex flex-wrap gap-x-3">
        {recipe.minutos > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {recipe.minutos} min</span>}
        <span>{recipe.raciones} {recipe.raciones === 1 ? 'ración' : 'raciones'}</span>
        <span className="text-blue-300 font-bold">Por ración: {m.kcal} kcal · P {m.protein} · H {m.carbs} · G {m.fat}</span>
      </p>
      <ul className="text-xs text-slate-300 list-disc pl-4 space-y-0.5">
        {recipe.ingredientes.map((i, idx) => <li key={idx}>{i.cantidad ? `${i.cantidad} · ` : ''}{i.nombre}</li>)}
      </ul>
      <ol className="text-xs text-slate-400 list-decimal pl-4 space-y-1">
        {recipe.pasos.map((p, idx) => <li key={idx}>{p}</li>)}
      </ol>
      <div className="flex items-center gap-2 pt-1">
        <MealPicker value={meal} onChange={setMeal} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onAdd(meal)}><Plus /> Añadir una ración</button>
      </div>
    </article>
  );
}

/** Recetas hechas con los alimentos que indicas, ajustadas a lo que te queda hoy. */
export default function RecipesPanel({ date, data, remaining }: RecipesPanelProps) {
  const { result, loading, error, run } = useNutritionAi('recipes');
  const [foods, setFoods] = useState('');
  const [notes, setNotes] = useState('');
  const [fit, setFit] = useState(true);
  const list = parseFoodList(foods);
  const canFit = !!remaining && remaining.kcal > 0;

  return (
    <AiShell id="ai-recipes" title="Recetas con lo que tengo" description="Escribe los alimentos que tienes (separados por comas) y la IA propone recetas. Puede añadir básicos como aceite o sal." loading={loading} error={error} meta={result}>
      <textarea id="ai-recipes-foods" value={foods} onChange={(e) => setFoods(e.target.value)} rows={2} placeholder="pollo, arroz, tomate, huevos…" className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
      <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Preferencias o restricciones (sin lactosa, rápido, picante…)" className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100" />
      <label className={`flex items-center gap-2 text-xs ${canFit ? 'text-slate-300' : 'text-slate-600'}`}>
        <input type="checkbox" checked={fit && canFit} disabled={!canFit} onChange={(e) => setFit(e.target.checked)} />
        Ajustar a lo que me queda hoy{canFit && remaining ? ` (${remaining.kcal} kcal, ${remaining.protein} g de proteína)` : ' (configura tus objetivos)'}
      </label>
      <button type="button" id="btn-ai-recipes" disabled={loading} onClick={() => run({ foods: list, remaining: fit && canFit ? remaining : null, notes })} className="btn btn-primary btn-sm disabled:opacity-40">
        {list.length ? `Crear recetas con ${list.length} ${list.length === 1 ? 'alimento' : 'alimentos'}` : 'Sugerir recetas'}
      </button>
      {result && (
        <div className="space-y-3">
          {result.recetas.map((r, i) => <RecipeCard key={i} recipe={r} onAdd={(meal) => data.addEntry(date, entryFromRecipe(r, meal))} />)}
        </div>
      )}
    </AiShell>
  );
}
