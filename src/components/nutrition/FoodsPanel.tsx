import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Food } from '../../utils/nutrition/types';
import { BASE_FOODS } from '../../data/foods';
import type { NutritionData } from '../../hooks/useNutritionData';
import FoodEditor from './FoodEditor';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function FoodRow({ food, onEdit, onDelete }: { food: Food; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-sm">
      <div className="min-w-0 flex-1">
        <div className="text-slate-200 truncate">{food.name}</div>
        <div className="text-[11px] text-slate-500 tabular-nums">
          P {food.protein} · H {food.carbs} · G {food.fat} (por 100 g){food.servingG ? ` · ${food.servingLabel ?? 'ración'} ${food.servingG} g` : ''}
        </div>
      </div>
      <span className="text-xs font-bold text-slate-300 tabular-nums shrink-0">{food.kcal} kcal</span>
      {onEdit && (
        <button type="button" onClick={onEdit} aria-label={`Editar ${food.name}`} className="text-slate-500 hover:text-blue-400 p-1 cursor-pointer"><Pencil className="h-4 w-4" /></button>
      )}
      {onDelete && (
        <button type="button" onClick={onDelete} aria-label={`Borrar ${food.name}`} className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
      )}
    </li>
  );
}

/** Tus alimentos propios y el catálogo básico incluido en la app. */
export default function FoodsPanel({ data }: { data: NutritionData }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ food: Food | null } | null>(null);
  const q = norm(query.trim());
  const match = (f: Food) => !q || norm(f.name).includes(q);
  const mine = useMemo(() => data.customFoods.filter(match), [data.customFoods, q]);
  const base = useMemo(() => BASE_FOODS.filter(match), [q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-white text-base">Alimentos</h2>
          <p className="text-xs text-slate-500">Valores medios aproximados. Para algo exacto, crea el tuyo con la etiqueta.</p>
        </div>
        <button type="button" id="btn-new-food" onClick={() => setEditing({ food: null })} className="btn btn-primary btn-sm">
          <Plus /> Nuevo alimento
        </button>
      </div>
      <div className="relative">
        <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar alimento" aria-label="Buscar alimento" className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      <section className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <h3 className="px-4 py-2.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800">Tus alimentos ({data.customFoods.length})</h3>
        {mine.length > 0 ? (
          <ul className="divide-y divide-slate-800/60">
            {mine.map((f) => (
              <FoodRow key={f.id} food={f} onEdit={() => setEditing({ food: f })} onDelete={() => data.deleteFood(f.id)} />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-4 text-xs text-slate-500">{data.customFoods.length === 0 ? 'Aún no has creado ninguno. Aparecerán los primeros al buscar.' : 'Sin coincidencias.'}</p>
        )}
      </section>

      <section className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <h3 className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">Catálogo básico ({BASE_FOODS.length})</h3>
        <ul className="divide-y divide-slate-800/60">
          {base.map((f) => (
            <FoodRow key={f.id} food={f} />
          ))}
          {base.length === 0 && <li className="px-4 py-4 text-xs text-slate-500">Sin coincidencias.</li>}
        </ul>
      </section>

      {editing && <FoodEditor key={editing.food?.id ?? 'new'} isOpen food={editing.food} onClose={() => setEditing(null)} onSave={data.saveFood} />}
    </div>
  );
}
