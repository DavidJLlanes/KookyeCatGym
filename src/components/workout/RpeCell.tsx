import React, { useState } from 'react';
import { Gauge } from 'lucide-react';
import AnchoredPopover from '../AnchoredPopover';

// Los 10 valores del RPE. hint = repeticiones que quedaban en reserva (10 - RPE;
// 0 = al fallo): una palabra o cifra para que quepa bajo cada botón.
const RPE_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const value = i + 1;
  const reserve = 10 - value;
  return { value, hint: reserve === 0 ? 'fallo' : String(reserve) };
});

export function rpeColor(rpe: number): string {
  if (rpe <= 5) return '#34d399';
  if (rpe <= 7) return '#fbbf24';
  if (rpe <= 8) return '#fb923c';
  return '#ef4444';
}

interface RpeCellProps {
  rpe?: number;
  onChange: (rpe: number | undefined) => void;
}

/** Botón de RPE de una serie con su selector flotante. */
export default function RpeCell({ rpe, onChange }: RpeCellProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const pick = (value: number | undefined) => {
    setAnchor(null);
    onChange(value);
  };

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
        className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition cursor-pointer ${
          rpe ? 'text-slate-950' : 'text-slate-500 hover:text-slate-300'
        }`}
        style={rpe ? { backgroundColor: rpeColor(rpe) } : undefined}
        title={rpe ? `RPE ${rpe}` : 'Añadir RPE'}
      >
        {rpe ?? <Gauge className="h-4 w-4" />}
      </button>

      {anchor && (
        <AnchoredPopover anchor={anchor} align="right" width={248} onClose={() => setAnchor(null)}>
          <div className="p-0.5">
            <p className="px-0.5 pb-1.5 text-[11px] leading-tight text-slate-400">RPE · reps que te quedaban en reserva</p>
            <div className="grid grid-cols-5 gap-1">
              {RPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => pick(opt.value)}
                  className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-slate-950 cursor-pointer ${
                    rpe === opt.value ? 'ring-2 ring-white' : ''
                  }`}
                  style={{ backgroundColor: rpeColor(opt.value) }}
                >
                  <span className="text-base font-bold leading-none">{opt.value}</span>
                  <span className="mt-1 text-[10px] font-semibold leading-none opacity-80">{opt.hint}</span>
                </button>
              ))}
            </div>
            {rpe && (
              <button
                type="button"
                onClick={() => pick(undefined)}
                className="w-full mt-2 py-1.5 rounded-lg text-xs font-bold text-slate-300 bg-slate-900 hover:bg-slate-950 cursor-pointer"
              >
                Quitar RPE
              </button>
            )}
          </div>
        </AnchoredPopover>
      )}
    </div>
  );
}
