import React, { useState} from 'react';
import { Trophy} from 'lucide-react';
import { getMuscleColor } from '../../data/exerciseMeta';
import { formatEsNumber} from '../../utils/number';

import type { useProgressStats } from '../../hooks/useProgressStats';

interface RecordsFeedCardProps {
  prEvents: ReturnType<typeof useProgressStats>['prEvents'];
}

export default function RecordsFeedCard({ prEvents }: RecordsFeedCardProps) {
  const [showAllPrs, setShowAllPrs] = useState(false);
  const visiblePrEvents = showAllPrs ? prEvents : prEvents.slice(0, 8);

  return (
    <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
      <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-400" />
        Historial de Récords
      </h3>
      {prEvents.length > 0 ? (
        <>
          <div className="space-y-1.5">
            {visiblePrEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: getMuscleColor(ev.muscleGroup) + '25', color: getMuscleColor(ev.muscleGroup) }}>
                  <Trophy className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-200 truncate">{ev.exerciseName}</div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(ev.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div className="text-xs font-extrabold text-amber-400 shrink-0 text-right">
                  {ev.type === 'weight' ? `${formatEsNumber(ev.value)} kg` : `${ev.value} ${ev.hold ? 's' : 'reps'}`}
                  <div className="text-[9px] text-slate-500 font-semibold">antes {ev.type === 'weight' ? `${formatEsNumber(ev.previousValue)} kg` : `${ev.previousValue} ${ev.hold ? 's' : 'reps'}`}</div>
                </div>
              </div>
            ))}
          </div>
          {prEvents.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAllPrs((v) => !v)}
              className="w-full text-center text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer py-1"
            >
              {showAllPrs ? 'Ver menos' : `Ver los ${prEvents.length} récords`}
            </button>
          )}
        </>
      ) : (
        <p className="text-slate-400 text-xs font-semibold text-center py-4">Todavía no se ha batido ningún récord (hace falta repetir un ejercicio para poder compararlo).</p>
      )}
    </div>
  );
}
