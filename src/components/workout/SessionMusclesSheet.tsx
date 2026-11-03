import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import BODY_PATHS from '../../data/bodyPaths';
import type { ActiveWorkout, Exercise } from '../../types';
import { BODY_PART_LABEL } from '../../utils/muscleStats';
import { maxSets, rankedParts, sessionMuscles } from '../../utils/sessionMuscles';
import { BodySide } from '../muscle/BodyFigure';

interface SessionMusclesSheetProps {
  workout: ActiveWorkout;
  exercises: Exercise[];
  onClose: () => void;
}

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

/**
 * Músculos de la sesión en curso: el contorno marca lo previsto y el relleno lo
 * que ya llevas hecho, para ver qué falta antes de terminar.
 */
export default function SessionMusclesSheet({ workout, exercises, onClose }: SessionMusclesSheetProps) {
  const { planned, done } = useMemo(() => sessionMuscles(workout.exercises, exercises), [workout.exercises, exercises]);
  const max = maxSets(planned);
  const rows = rankedParts(planned);
  const totalPlanned = rows.reduce((sum, [, n]) => sum + n, 0);
  const totalDone = rows.reduce((sum, [part]) => sum + Math.min(done[part] ?? 0, planned[part]), 0);

  return (
    <div
      className="fixed inset-0 bg-slate-950/85 z-[110] flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-label="Músculos de la sesión" className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90dvh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div>
            <h3 className="font-extrabold text-white text-sm">Músculos de la sesión</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {rows.length === 0 ? 'Aún no hay series en la sesión.' : `${fmt(totalDone)} de ${fmt(totalPlanned)} series ponderadas hechas`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          <div className="flex gap-2 justify-center">
            <BodySide view={BODY_PATHS.front} load={done} max={max} outline={planned} interactive={false} className="h-auto w-full max-h-[260px]" />
            <BodySide view={BODY_PATHS.back} load={done} max={max} outline={planned} interactive={false} className="h-auto w-full max-h-[260px]" />
          </div>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[3px] border-2 border-dashed border-blue-300" /> Previsto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[3px] bg-blue-500" /> Hecho
            </span>
          </div>

          <ul className="space-y-2">
            {rows.map(([part, plannedSets]) => {
              const doneSets = Math.min(done[part] ?? 0, plannedSets);
              const complete = doneSets >= plannedSets;
              return (
                <li key={part}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-bold text-slate-200">{BODY_PART_LABEL[part] ?? part}</span>
                    <span className={complete ? 'font-bold text-emerald-400' : 'text-slate-400'}>
                      {fmt(doneSets)} / {fmt(plannedSets)} series
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full ${complete ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${(doneSets / plannedSets) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
