import React, { useState } from 'react';
import { ListChecks, Play } from 'lucide-react';
import type { Exercise, Routine, WorkoutLog } from '../../types';
import { useUserData } from '../../context/UserDataContext';
import { PROGRAMS } from '../../data/programs';
import { bumpedMaxes, buildProgramRoutine, mainLifts, programPosition } from '../../utils/programs';
import { localDayKey } from '../../utils/userData';
import ProgramsModal from './ProgramsModal';

interface ProgramCardProps {
  exercises: Exercise[];
  logs: WorkoutLog[];
  /** Empieza la sesión; los ids son los principales, cuya carga no se pisa con la de la última vez. */
  onStartSession: (routine: Routine, exactIds: Set<string>) => void;
}

/** Programa en marcha (qué toca hoy) o acceso a la lista de programas. */
export default function ProgramCard({ exercises, logs, onStartSession }: ProgramCardProps) {
  const { data, setValue } = useUserData();
  const [open, setOpen] = useState(false);
  const active = data.program;
  const program = active ? PROGRAMS.find((p) => p.id === active.programId) : undefined;
  const position = active && program ? programPosition(program, active, logs) : null;

  const startSession = () => {
    if (!active || !program || !position) return;
    onStartSession(buildProgramRoutine(program, active, position.week, position.day), new Set(mainLifts(program)));
  };
  const repeatHeavier = () => {
    if (!active) return;
    setValue('program', { ...active, startDate: localDayKey(), trainingMaxes: bumpedMaxes(active.trainingMaxes) });
  };

  return (
    <>
      <div id="program-card" className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ListChecks className="h-5 w-5 text-blue-400 shrink-0" />
            <h4 className="font-bold text-slate-100 truncate">{program ? program.name : 'Programas de entrenamiento'}</h4>
          </div>
          <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-blue-400 hover:text-blue-300 cursor-pointer shrink-0">
            {program ? 'Cambiar' : 'Ver programas'}
          </button>
        </div>

        {!program || !position ? (
          <p className="text-xs text-slate-400">Planes de varias semanas con la carga de cada sesión ya calculada a partir de tu máximo: fuerza en olas, hipertrofia o 5×5.</p>
        ) : position.finished ? (
          <>
            <p className="text-sm text-emerald-300 font-bold">¡Programa completado!</p>
            <div className="flex gap-2">
              <button type="button" onClick={repeatHeavier} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer">
                Repetir con más carga
              </button>
              <button type="button" onClick={() => setValue('program', null)} className="px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer">
                Terminar
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Te toca</div>
              <div className="text-sm font-bold text-slate-100">{program.weeks[position.week].label} · {program.days[position.day].name}</div>
              <div className="text-xs text-slate-500">Sesión {position.done + 1} de {position.total}</div>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-label="Progreso del programa" aria-valuemin={0} aria-valuemax={position.total} aria-valuenow={position.done}>
              <div className="h-full bg-blue-500" style={{ width: `${(position.done / position.total) * 100}%` }} />
            </div>
            <div className="flex gap-2">
              <button id="btn-start-program-session" type="button" onClick={startSession} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold cursor-pointer">
                <Play className="h-4 w-4" /> Empezar sesión
              </button>
              <button type="button" onClick={() => setValue('program', null)} className="px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer">
                Abandonar
              </button>
            </div>
          </>
        )}
      </div>

      {open && (
        <ProgramsModal
          exercises={exercises}
          logs={logs}
          onClose={() => setOpen(false)}
          onStart={(a) => {
            setValue('program', a);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
