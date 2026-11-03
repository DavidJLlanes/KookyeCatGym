import { TrendingUp, Calendar, ArrowUp, ArrowDown} from 'lucide-react';
import { formatEsNumber} from '../../utils/number';

import type { useProgressStats } from '../../hooks/useProgressStats';

interface YearOverYearCardProps {
  yearOverYear: ReturnType<typeof useProgressStats>['yearOverYear'];
  pctChange: (curr: number, prev: number) => number | null;
}

export default function YearOverYearCard({ yearOverYear, pctChange }: YearOverYearCardProps) {
  return (
      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2 capitalize">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          {yearOverYear.monthName} vs. Año Pasado
        </h3>
        {yearOverYear.hasPreviousData ? (
          <div className="grid grid-cols-3 gap-2">
            {([
              ['Entrenamientos', yearOverYear.current.workouts, yearOverYear.previous.workouts, ''],
              ['Series', yearOverYear.current.sets, yearOverYear.previous.sets, ''],
              ['Volumen', yearOverYear.current.volume, yearOverYear.previous.volume, ' kg'],
            ] as const).map(([label, curr, prev, suffix]) => {
              const delta = pctChange(curr, prev);
              return (
                <div key={label} className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-center space-y-1 min-w-0">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">{label}</div>
                  <div className="text-lg font-black text-white truncate">{formatEsNumber(curr)}{suffix}</div>
                  <div className="text-[10px] text-slate-500 truncate">antes: {formatEsNumber(prev)}{suffix}</div>
                  {delta !== null && (
                    <div className={`flex items-center justify-center gap-0.5 text-[10px] font-bold ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {Math.abs(delta)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-6 space-y-2">
            <Calendar className="h-8 w-8 text-slate-650 mx-auto" />
            <p className="text-slate-400 text-xs font-semibold">Aún no hay datos de este mes hace un año para comparar.</p>
          </div>
        )}
      </div>
  );
}
