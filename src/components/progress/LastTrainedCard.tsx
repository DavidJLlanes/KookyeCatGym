import { Target} from 'lucide-react';
import { getMuscleColor } from '../../data/exerciseMeta';

import type { useProgressStats } from '../../hooks/useProgressStats';

interface LastTrainedCardProps {
  daysSinceByMuscle: ReturnType<typeof useProgressStats>['daysSinceByMuscle'];
}

export default function LastTrainedCard({ daysSinceByMuscle }: LastTrainedCardProps) {
  return (
      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-400" />
          Última Vez por Grupo Muscular
        </h3>
        <div className="space-y-1.5">
          {daysSinceByMuscle.map(({ group, days }) => (
            <div key={group} className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getMuscleColor(group) }} />
                <span className="text-slate-300">{group}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${
                days === null ? 'bg-slate-950 border-slate-800 text-slate-500'
                : days <= 3 ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400'
                : days <= 7 ? 'bg-amber-950/40 border-amber-500/20 text-amber-400'
                : 'bg-rose-950/40 border-rose-500/20 text-rose-400'
              }`}>
                {days === null ? 'Sin datos' : days === 0 ? 'Hoy' : `Hace ${days} día${days === 1 ? '' : 's'}`}
              </span>
            </div>
          ))}
        </div>
      </div>
  );
}
