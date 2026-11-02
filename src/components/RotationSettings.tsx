import React, { useState } from 'react';
import { Repeat, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
import type { Routine } from '../types';
import { useUserData } from '../context/UserDataContext';
import { cycleLetter, rotationRoutines } from '../utils/rotation';

/**
 * Configuración de la rotación de sesiones: eliges qué rutinas forman el ciclo
 * y en qué orden. La siguiente sesión es la que toca después de la última que
 * hiciste (se muestra en la pestaña Entrenar).
 */
export default function RotationSettings({ routines }: { routines: Routine[] }) {
  const { data, setValue } = useUserData();
  const config = data.rotation;
  const [open, setOpen] = useState(false);

  const cycle = rotationRoutines(config, routines);
  const inCycle = new Set(cycle.map((r) => r.id));
  const others = routines.filter((r) => !inCycle.has(r.id));

  const update = (next: Partial<typeof config>) => setValue('rotation', { ...config, routineIds: cycle.map((r) => r.id), ...next });
  const move = (index: number, dir: -1 | 1) => {
    const ids = cycle.map((r) => r.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    update({ routineIds: ids });
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer">
        <Repeat className="h-4 w-4 text-blue-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-100">Rotación de sesiones</div>
          <div className="text-xs text-slate-400 truncate">
            {config.enabled && cycle.length > 0
              ? `Activa · ${cycle.map((r, i) => `${cycleLetter(i)}: ${r.name}`).join(' → ')}`
              : 'Sin días fijos: la siguiente sesión es la que toca después de la última que hiciste.'}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-800 pt-4">
          <label className="flex items-center gap-3 text-sm text-slate-200 cursor-pointer">
            <input type="checkbox" checked={config.enabled} onChange={(e) => update({ enabled: e.target.checked })} className="h-4 w-4 accent-blue-500" />
            Usar rotación (A, B, C, A…) en lugar de días de la semana
          </label>

          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ciclo, en orden</div>
            {cycle.length === 0 && <p className="text-xs text-slate-500">Añade rutinas de la lista de abajo para formar el ciclo.</p>}
            <ol className="space-y-1.5">
              {cycle.map((r, i) => (
                <li key={r.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-sm">
                  <span className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-300 text-xs font-black flex items-center justify-center shrink-0">{cycleLetter(i)}</span>
                  <span className="flex-1 min-w-0 truncate text-slate-200">{r.name}</span>
                  <button type="button" aria-label={`Subir ${r.name}`} disabled={i === 0} onClick={() => move(i, -1)} className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" aria-label={`Bajar ${r.name}`} disabled={i === cycle.length - 1} onClick={() => move(i, 1)} className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => update({ routineIds: cycle.filter((x) => x.id !== r.id).map((x) => x.id) })} className="px-2 py-1 text-xs font-bold text-slate-400 hover:text-red-400 cursor-pointer">Quitar</button>
                </li>
              ))}
            </ol>
          </div>

          {others.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Otras rutinas</div>
              <div className="flex flex-wrap gap-1.5">
                {others.map((r) => (
                  <button key={r.id} type="button" onClick={() => update({ routineIds: [...cycle.map((x) => x.id), r.id] })} className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-xs text-slate-300 cursor-pointer">
                    + {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
