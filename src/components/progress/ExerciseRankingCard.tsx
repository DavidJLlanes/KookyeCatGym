import { ListOrdered} from 'lucide-react';
import { formatEsCompactKg } from '../../utils/number';

import type { useProgressStats } from '../../hooks/useProgressStats';

interface ExerciseRankingCardProps {
  exerciseRanking: ReturnType<typeof useProgressStats>['exerciseRanking'];
}

export default function ExerciseRankingCard({ exerciseRanking }: ExerciseRankingCardProps) {
  return (
    <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
      <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
        <ListOrdered className="h-5 w-5 text-blue-400" />
        Ejercicios Más Entrenados (por volumen)
      </h3>
      {exerciseRanking.length > 0 ? (
        <div className="space-y-1.5">
          {exerciseRanking.map((item, i) => (
            <div key={item.exerciseId} className="flex items-center gap-3 bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black shrink-0">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-200 truncate">{item.name}</div>
                <div className="text-[10px] text-slate-500">{item.sets} series</div>
              </div>
              <div className="text-xs font-extrabold text-blue-400 shrink-0">{formatEsCompactKg(item.volume)}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-400 text-xs font-semibold text-center py-4">Aún no hay series completadas.</p>
      )}
    </div>
  );
}
