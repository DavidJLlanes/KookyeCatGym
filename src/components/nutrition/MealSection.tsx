import { Plus, X } from 'lucide-react';
import { LogEntry } from '../../utils/nutrition/types';
import { sumMacros } from '../../utils/nutrition/totals';

interface MealSectionProps {
  id: string;
  label: string;
  entries: LogEntry[];
  onAdd: () => void;
  onRemove: (entryId: string) => void;
}

/** Una comida del día (desayuno, comida...) con sus alimentos. */
export default function MealSection({ id, label, entries, onAdd, onRemove }: MealSectionProps) {
  const total = sumMacros(entries);
  return (
    <section id={`meal-${id}`} className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800/70">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-100 text-sm">{label}</h3>
          <p className="text-[11px] text-slate-500 tabular-nums">{entries.length === 0 ? 'Sin registrar' : `${total.kcal} kcal · P ${total.protein} · H ${total.carbs} · G ${total.fat}`}</p>
        </div>
        <button type="button" onClick={onAdd} aria-label={`Añadir a ${label}`} className="btn btn-secondary btn-sm shrink-0">
          <Plus /> Añadir
        </button>
      </header>
      {entries.length > 0 && (
        <ul className="divide-y divide-slate-800/60">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="text-slate-200 truncate">{e.name}</div>
                <div className="text-[11px] text-slate-500 tabular-nums">
                  {e.grams ? `${e.grams} g · ` : ''}P {e.protein} · H {e.carbs} · G {e.fat}
                </div>
              </div>
              <span className="text-xs font-bold text-slate-300 tabular-nums shrink-0">{e.kcal} kcal</span>
              <button type="button" onClick={() => onRemove(e.id)} aria-label={`Quitar ${e.name}`} className="text-slate-500 hover:text-rose-400 p-1 rounded cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
