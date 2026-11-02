import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Check, CalendarDays, Gauge } from 'lucide-react';
import type { Exercise, Routine } from '../types';
import { STARTER_PLANS, instantiateStarterPlan } from '../data/starterPlans';

interface StarterPlansModalProps {
  exercises: Exercise[];
  /** Carpetas que ya existen: un plan cuya carpeta ya está en tus rutinas se marca como añadido. */
  existingFolders: string[];
  onAdd: (routines: Routine[]) => void;
  onClose: () => void;
}

export default function StarterPlansModal({ exercises, existingFolders, onAdd, onClose }: StarterPlansModalProps) {
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const exerciseName = (id: string) => exercises.find((e) => e.id === id)?.name ?? id;

  const add = (planId: string) => {
    const plan = STARTER_PLANS.find((p) => p.id === planId);
    if (!plan) return;
    const { routines } = instantiateStarterPlan(plan, exercises);
    if (routines.length === 0) return;
    onAdd(routines);
    setJustAdded(plan.name);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Planes de iniciación">
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full sm:max-w-2xl max-h-[92dvh] flex flex-col bg-slate-900 border border-slate-800 sm:rounded-3xl rounded-t-3xl shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="font-black text-white">Planes de iniciación</h3>
            <p className="text-xs text-slate-400">Rutinas clásicas ya montadas. Se añaden como rutinas normales, en su propia carpeta, y las puedes editar.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-3">
          {justAdded && (
            <div role="status" className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 flex gap-2">
              <Check className="h-4 w-4 shrink-0" />
              «{justAdded}» añadido en la carpeta con ese nombre. Los pesos empiezan en 0: apúntalos la primera vez y la app los recordará.
            </div>
          )}
          {STARTER_PLANS.map((plan) => {
            const already = existingFolders.includes(plan.name);
            return (
              <div key={plan.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-100">{plan.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{plan.tagline}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{plan.daysPerWeek}</span>
                      <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{plan.level}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(plan.id)}
                    disabled={already}
                    className="shrink-0 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:cursor-default"
                  >
                    {already ? 'Ya añadido' : 'Añadir'}
                  </button>
                </div>
                <ul className="space-y-1.5">
                  {plan.routines.map((r) => (
                    <li key={r.name} className="text-xs">
                      <span className="font-bold text-slate-300">{r.name}</span>
                      <span className="text-slate-500"> · {r.exercises.map((e) => `${exerciseName(e.id)} ${e.sets}×${e.reps}`).join(' · ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
