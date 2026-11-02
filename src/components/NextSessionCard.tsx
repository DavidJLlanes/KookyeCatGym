import React from 'react';
import { Play, Repeat } from 'lucide-react';
import type { Routine, WorkoutLog } from '../types';
import { useUserData } from '../context/UserDataContext';
import { cycleLetter, rotationRoutines, upcomingInRotation } from '../utils/rotation';

/** "Te toca": la siguiente sesión de la rotación, con un botón para empezarla. */
export default function NextSessionCard({ routines, logs, onStart }: { routines: Routine[]; logs: WorkoutLog[]; onStart: (r: Routine) => void }) {
  const { data } = useUserData();
  const config = data.rotation;
  const upcoming = upcomingInRotation(config, routines, logs, 3);
  if (upcoming.length === 0) return null;

  const cycle = rotationRoutines(config, routines);
  const next = upcoming[0];
  const letterOf = (r: Routine) => cycleLetter(cycle.findIndex((c) => c.id === r.id));

  return (
    <div id="next-session-card" className="bg-slate-900 rounded-2xl border border-blue-500/30 p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="p-3 bg-blue-950/40 text-blue-400 rounded-2xl border border-blue-500/20 shrink-0">
          <Repeat className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Te toca · rotación</div>
          <h4 className="font-bold text-slate-100 truncate">{letterOf(next)} · {next.name}</h4>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {next.exercises.length} ejercicios
            {upcoming.length > 1 && <> · después: {upcoming.slice(1).map((r) => `${letterOf(r)} ${r.name}`).join(', ')}</>}
          </p>
        </div>
      </div>
      <button type="button" onClick={() => onStart(next)} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold cursor-pointer shrink-0">
        <Play className="h-4 w-4" />
        Empezar
      </button>
    </div>
  );
}
