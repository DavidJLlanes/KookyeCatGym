import { useState } from 'react';
import { WorkoutLog } from '../types';
import { useNutritionData } from '../hooks/useNutritionData';
import { useNutritionTargets } from '../hooks/useNutritionTargets';
import { DEFAULT_PROFILE } from '../utils/nutrition/types';
import { localDayKey } from '../utils/userData';
import TodayView from './nutrition/TodayView';
import FoodsPanel from './nutrition/FoodsPanel';
import TargetsPanel from './nutrition/TargetsPanel';
import WeekView from './nutrition/WeekView';

type SubTab = 'today' | 'foods' | 'goals' | 'week';
const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'foods', label: 'Alimentos' },
  { id: 'goals', label: 'Objetivos' },
  { id: 'week', label: 'Semana' },
];

/** Pestaña Nutrición: orquesta el diario, los alimentos, los objetivos y el resumen semanal. */
export default function NutritionTab({ logs }: { logs: WorkoutLog[] }) {
  const data = useNutritionData();
  const [date, setDate] = useState(localDayKey());
  const { targets, isTrainingDay } = useNutritionTargets(data.profile, logs, date);
  // Sin objetivos aún, se empieza por la pestaña de Objetivos
  const [sub, setSub] = useState<SubTab>(data.profile ? 'today' : 'goals');

  return (
    <div className="space-y-5">
      <div role="tablist" className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={sub === t.id}
            id={`nutrition-sub-${t.id}`}
            onClick={() => setSub(t.id)}
            className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${sub === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'today' && (
        <TodayView
          date={date}
          setDate={setDate}
          data={data}
          targets={targets}
          isTrainingDay={isTrainingDay}
          waterGoalMl={(data.profile ?? DEFAULT_PROFILE).waterGoalMl}
          onGoToGoals={() => setSub('goals')}
        />
      )}
      {sub === 'foods' && <FoodsPanel data={data} />}
      {sub === 'goals' && <TargetsPanel profile={data.profile} onSave={data.saveProfile} />}
      {sub === 'week' && <WeekView data={data} targets={targets} />}
    </div>
  );
}
