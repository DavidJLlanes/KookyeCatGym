import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CalendarDays, Gauge, X } from 'lucide-react';
import type { Exercise, WorkoutLog } from '../../types';
import { PROGRAMS } from '../../data/programs';
import { ActiveProgram, Program, liftName, mainLifts, suggestTrainingMax } from '../../utils/programs';
import { localDayKey } from '../../utils/userData';
import DecimalInput from '../DecimalInput';

interface ProgramsModalProps {
  exercises: Exercise[];
  logs: WorkoutLog[];
  onStart: (program: ActiveProgram) => void;
  onClose: () => void;
}

/** Elegir un programa y apuntar el máximo de entrenamiento de cada levantamiento principal. */
export default function ProgramsModal({ exercises, logs, onStart, onClose }: ProgramsModalProps) {
  const [picked, setPicked] = useState<Program | null>(null);
  const [maxes, setMaxes] = useState<Record<string, number>>({});

  const choose = (program: Program) => {
    setPicked(program);
    setMaxes(Object.fromEntries(mainLifts(program).map((id) => [id, suggestTrainingMax(id, logs) ?? 0])));
  };
  const ready = picked !== null && mainLifts(picked).every((id) => (maxes[id] ?? 0) > 0);

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Programas de entrenamiento">
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full sm:max-w-2xl max-h-[92dvh] flex flex-col bg-slate-900 border border-slate-800 sm:rounded-3xl rounded-t-3xl shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            {picked && (
              <button type="button" onClick={() => setPicked(null)} aria-label="Volver a la lista" className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0">
              <h3 className="font-black text-white">{picked ? picked.name : 'Programas'}</h3>
              <p className="text-xs text-slate-400">
                {picked ? 'Apunta tu máximo de entrenamiento en cada levantamiento principal.' : 'Planes de varias semanas: la app calcula la carga de cada sesión.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-3">
          {!picked &&
            PROGRAMS.map((program) => (
              <div key={program.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-100">{program.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{program.tagline}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{program.weeks.length} semanas · {program.days.length} sesiones por vuelta</span>
                      <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{program.level}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => choose(program)} className="shrink-0 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer">
                    Elegir
                  </button>
                </div>
                <ul className="text-xs text-slate-500 space-y-0.5">
                  {program.days.map((d) => (
                    <li key={d.name}><span className="font-bold text-slate-300">{d.name}</span> · {d.exercises.map((e) => liftName(e.exerciseId, exercises)).join(' · ')}</li>
                  ))}
                </ul>
              </div>
            ))}

          {picked && (
            <>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {picked.weeks.map((w) => (
                  <li key={w.label}>
                    <span className="font-bold text-slate-300">{w.label}</span>: {w.scheme.map((s) => `${s.reps} reps al ${s.percent} %`).join(' · ')}
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                {mainLifts(picked).map((id) => (
                  <label key={id} className="flex items-center gap-3 text-sm text-slate-200">
                    <span className="flex-1 min-w-0 truncate">{liftName(id, exercises)}</span>
                    <DecimalInput
                      value={maxes[id] ?? 0}
                      onChange={(v) => setMaxes((m) => ({ ...m, [id]: v }))}
                      placeholder="kg"
                      className="w-24 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 text-right"
                    />
                    <span className="text-xs text-slate-500 w-5">kg</span>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                El máximo de entrenamiento es un peso que moverías bien en una serie dura, en torno al 90 % de tu 1RM. Se rellena con lo que ya has entrenado cuando hay datos; si no, ponlo tú. Las cargas se redondean a 2,5 kg.
              </p>
              <button
                type="button"
                disabled={!ready}
                onClick={() => onStart({ programId: picked.id, startDate: localDayKey(), trainingMaxes: maxes })}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-sm font-bold cursor-pointer disabled:cursor-not-allowed"
              >
                Empezar programa
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
