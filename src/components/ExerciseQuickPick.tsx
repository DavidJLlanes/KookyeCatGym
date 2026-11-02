import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Exercise } from '../types';

interface ExerciseQuickPickProps {
  exercises: Exercise[];
  /** Ids que no deben aparecer (ya elegidos, o el propio ejercicio). */
  exclude: string[];
  /** Si se da, los ejercicios de este grupo muscular salen primero. */
  preferGroup?: string;
  placeholder?: string;
  onPick: (exercise: Exercise) => void;
}

/** Buscador compacto de ejercicios con desplegable de resultados (mín. 2 letras). */
export default function ExerciseQuickPick({ exercises, exclude, preferGroup, placeholder = 'Busca un ejercicio…', onPick }: ExerciseQuickPickProps) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const skip = new Set(exclude);
    const found = exercises.filter((e) => !skip.has(e.id) && e.name.toLowerCase().includes(q));
    if (preferGroup) found.sort((a, b) => Number(b.muscleGroup === preferGroup) - Number(a.muscleGroup === preferGroup));
    return found.slice(0, 8);
  }, [query, exercises, exclude, preferGroup]);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-xs text-slate-100 placeholder-slate-600 outline-none"
        />
      </div>
      {matches.length > 0 && (
        <ul className="rounded-lg border border-slate-800 bg-slate-950 divide-y divide-slate-800 overflow-hidden">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(m);
                  setQuery('');
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                {m.name} <span className="text-slate-500">· {m.muscleGroup} · {m.equipment}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
