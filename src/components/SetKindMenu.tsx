import React from 'react';
import { SET_KINDS, SetKind } from '../utils/setTypes';

// Lista de tipos de serie (Normal, Calentamiento, Drop set, Al fallo, Rest-pause)
export default function SetKindMenu({ current, onSelect }: { current: SetKind; onSelect: (kind: SetKind) => void }) {
  return (
    <div className="text-left">
      {SET_KINDS.map((k) => (
        <button
          key={k.kind}
          type="button"
          onClick={() => onSelect(k.kind)}
          className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left cursor-pointer hover:bg-slate-900 ${
            current === k.kind ? 'bg-slate-900' : ''
          }`}
        >
          <span className="w-7 text-center text-xs font-black" style={{ color: k.color }}>
            {k.short || '#'}
          </span>
          <span className="flex flex-col">
            <span className="text-xs font-bold text-slate-200">{k.label}</span>
            <span className="text-[10px] text-slate-400">{k.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
