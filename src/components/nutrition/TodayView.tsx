import { useState } from 'react';
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { MEALS, MealId } from '../../utils/nutrition/types';
import { NutritionTargets } from '../../utils/nutrition/energy';
import { dayTotals, entriesByMeal, shiftDay } from '../../utils/nutrition/totals';
import { localDayKey } from '../../utils/userData';
import type { NutritionData } from '../../hooks/useNutritionData';
import DayOverview from './DayOverview';
import MealSection from './MealSection';
import WaterCard from './WaterCard';
import AddFoodModal from './AddFoodModal';

interface TodayViewProps {
  date: string;
  setDate: (date: string) => void;
  data: NutritionData;
  targets: NutritionTargets | null;
  isTrainingDay: boolean;
  waterGoalMl: number;
  onGoToGoals: () => void;
}

const dayLabel = (date: string) => {
  const today = localDayKey();
  if (date === today) return 'Hoy';
  if (date === shiftDay(today, -1)) return 'Ayer';
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
};

/** Diario de un día: resumen, agua y las cuatro comidas. */
export default function TodayView({ date, setDate, data, targets, isTrainingDay, waterGoalMl, onGoToGoals }: TodayViewProps) {
  const [adding, setAdding] = useState<MealId | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const day = data.log[date];
  const isToday = date === localDayKey();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setDate(shiftDay(date, -1))} aria-label="Día anterior" className="btn btn-secondary btn-sm">
          <ChevronLeft />
        </button>
        <h2 className="font-black text-white text-base capitalize text-center flex-1">{dayLabel(date)}</h2>
        <button type="button" onClick={() => setDate(shiftDay(date, 1))} disabled={isToday} aria-label="Día siguiente" className="btn btn-secondary btn-sm disabled:opacity-40">
          <ChevronRight />
        </button>
      </div>

      {!targets && (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-3">
          <span>Para ver tus objetivos de calorías y macros, rellena tus datos y registra tu peso.</span>
          <button type="button" onClick={onGoToGoals} className="btn btn-secondary btn-sm">Configurar objetivos</button>
        </div>
      )}

      <DayOverview eaten={dayTotals(day)} targets={targets} isTrainingDay={isTrainingDay} />
      <WaterCard waterMl={day?.waterMl ?? 0} goalMl={waterGoalMl} onAdd={(ml) => data.addWater(date, ml)} />

      {MEALS.map((m) => (
        <MealSection key={m.id} id={m.id} label={m.label} entries={entriesByMeal(day, m.id)} onAdd={() => setAdding(m.id)} onRemove={(id) => data.removeEntry(date, id)} />
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setCopied(data.copyFromYesterday(date))}
          className="btn btn-secondary btn-sm"
        >
          <Copy /> Copiar lo de ayer
        </button>
        {copied !== null && <span className="text-xs text-slate-400">{copied === 0 ? 'Ayer no hay nada registrado.' : `Copiadas ${copied} anotaciones.`}</span>}
      </div>

      <AddFoodModal
        isOpen={adding !== null}
        meal={adding ?? 'breakfast'}
        key={adding ?? 'closed'}
        foods={data.allFoods}
        onClose={() => setAdding(null)}
        onAddFood={(food, grams, meal) => data.addFoodEntry(date, food, grams, meal)}
        onAddManual={(entry) => data.addEntry(date, entry)}
      />
    </div>
  );
}
