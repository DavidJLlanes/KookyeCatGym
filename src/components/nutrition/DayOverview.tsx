import { Flame } from 'lucide-react';
import { Macros } from '../../utils/nutrition/types';
import { NutritionTargets } from '../../utils/nutrition/energy';
import MacroBar from './MacroBar';

interface DayOverviewProps {
  eaten: Macros;
  targets: NutritionTargets | null;
  isTrainingDay: boolean;
}

/** Resumen del día: calorías y macros comidos frente al objetivo. */
export default function DayOverview({ eaten, targets, isTrainingDay }: DayOverviewProps) {
  const left = targets ? targets.kcal - eaten.kcal : null;
  return (
    <section id="nutrition-day-overview" className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-amber-400" /> Calorías
          </div>
          <div className="text-3xl font-black text-white tabular-nums" id="nutrition-kcal-eaten">
            {eaten.kcal}
            {targets && <span className="text-base font-bold text-slate-500"> / {targets.kcal} kcal</span>}
          </div>
        </div>
        {left !== null && (
          <div className="text-right">
            <div className={`text-lg font-black tabular-nums ${left < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{Math.abs(left)} kcal</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{left < 0 ? 'te has pasado' : 'te quedan'}</div>
          </div>
        )}
      </div>
      {targets && (
        <div className="h-3 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-label="Calorías" aria-valuenow={eaten.kcal} aria-valuemax={targets.kcal}>
          <div className={`h-full rounded-full ${eaten.kcal > targets.kcal * 1.1 ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (eaten.kcal / targets.kcal) * 100)}%` }} />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MacroBar label="Proteína" value={eaten.protein} target={targets?.protein ?? null} color="bg-rose-500" />
        <MacroBar label="Hidratos" value={eaten.carbs} target={targets?.carbs ?? null} color="bg-sky-500" />
        <MacroBar label="Grasa" value={eaten.fat} target={targets?.fat ?? null} color="bg-yellow-500" />
      </div>
      {targets && (
        <p className="text-[11px] text-slate-500">
          Objetivo de {isTrainingDay ? 'día de entreno' : 'día sin entreno'}. Si hoy aún no has entrenado, cuenta como día sin entreno hasta que registres la sesión.
        </p>
      )}
    </section>
  );
}
