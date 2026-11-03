import React, { useMemo } from 'react';
import { Target } from 'lucide-react';
import type { WorkoutLog } from '../../types';
import type { BodyWeightEntry } from '../../utils/userData';
import { atgProgress } from '../../utils/atgStandards';
import { formatEsNumber } from '../../utils/number';

/** Objetivos ATG en % del peso corporal, con cuánto llevas de cada uno. */
export default function AtgStandardsCard({ logs, entries }: { logs: WorkoutLog[]; entries: BodyWeightEntry[] }) {
  const rows = useMemo(() => atgProgress(logs, entries), [logs, entries]);
  if (rows.length === 0) return null;
  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-3">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-emerald-400" />
        <h3 className="font-bold text-white text-sm">Estándares ATG</h3>
      </div>
      <ul className="space-y-3">
        {rows.map(({ standard, targetKg, bestKg, progress }) => (
          <li key={standard.id} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-slate-300 min-w-0">{standard.label}</span>
              <span className="text-xs text-slate-400 shrink-0">
                {bestKg > 0 ? `${formatEsNumber(bestKg, 1)} / ` : ''}
                {formatEsNumber(targetKg, 1)} kg × {standard.reps}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-valuenow={Math.round(Math.min(progress, 1) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso en ${standard.label}`}>
              <div className={`h-full ${progress >= 1 ? 'bg-emerald-400' : 'bg-blue-500'}`} style={{ width: `${Math.min(progress, 1) * 100}%` }} />
            </div>
            {standard.note && <div className="text-[11px] text-slate-500">{standard.note}</div>}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Objetivos de Ben Patrick (ATG) en % de tu peso actual, según la compilación de a1athlete.com. No es una lista oficial y solo incluye los ejercicios que la biblioteca permite emparejar sin dudas.
      </p>
    </div>
  );
}
