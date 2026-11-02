import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { REST_OPTIONS, formatRest, nearestRestOption } from '../utils/restTimes';

const ROW = 44; // alto de cada fila (px)
const VISIBLE = 5; // filas visibles: la central es la elegida

interface RestTimePickerProps {
  title: string;
  /** Segundos actuales (undefined = sin valor propio). */
  value: number | undefined;
  /** Valor por defecto con el que arranca la rueda si no hay `value`. */
  fallback: number;
  /** Si se da, aparece el botón para quitar el valor propio y volver al heredado. */
  clearLabel?: string;
  onSelect: (seconds: number) => void;
  onClear?: () => void;
  onClose: () => void;
}

/**
 * Rueda para elegir un descanso: de "Sin descanso" a 15 minutos. Se desliza (o
 * se toca una fila) y la fila del centro es la elegida.
 */
export default function RestTimePicker({ title, value, fallback, clearLabel, onSelect, onClear, onClose }: RestTimePickerProps) {
  const start = nearestRestOption(value ?? fallback);
  const [index, setIndex] = useState(() => Math.max(0, REST_OPTIONS.indexOf(start)));
  const listRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Coloca la rueda en el valor inicial al abrir
  useEffect(() => {
    listRef.current?.scrollTo({ top: index * ROW });
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const el = listRef.current;
      if (!el) return;
      const i = Math.min(REST_OPTIONS.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
      setIndex(i);
    }, 80);
  };

  const goTo = (i: number) => {
    setIndex(i);
    listRef.current?.scrollTo({ top: i * ROW, behavior: 'smooth' });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      goTo(Math.min(REST_OPTIONS.length - 1, index + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      goTo(Math.max(0, index - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSelect(REST_OPTIONS[index]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const pad = ((VISIBLE - 1) / 2) * ROW;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-xs bg-slate-900 border border-slate-800 sm:rounded-3xl rounded-t-3xl shadow-2xl p-5 space-y-4">
        <h3 className="text-sm font-black text-white text-center">{title}</h3>

        <div className="relative" style={{ height: ROW * VISIBLE }}>
          <div className="pointer-events-none absolute inset-x-0 border-y border-blue-500/40 bg-blue-500/10 rounded-lg" style={{ top: pad, height: ROW }} />
          <div
            ref={listRef}
            onScroll={onScroll}
            onKeyDown={onKeyDown}
            tabIndex={0}
            role="listbox"
            aria-label={title}
            aria-activedescendant={`rest-opt-${REST_OPTIONS[index]}`}
            className="h-full overflow-y-auto snap-y snap-mandatory outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ paddingTop: pad, paddingBottom: pad }}
          >
            {REST_OPTIONS.map((o, i) => (
              <div
                key={o}
                id={`rest-opt-${o}`}
                role="option"
                aria-selected={i === index}
                onClick={() => goTo(i)}
                className={`snap-center flex items-center justify-center cursor-pointer select-none transition-colors ${i === index ? 'text-white font-black text-lg' : 'text-slate-500 text-base'}`}
                style={{ height: ROW }}
              >
                {formatRest(o)}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => onSelect(REST_OPTIONS[index])} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold cursor-pointer">
            Listo · {formatRest(REST_OPTIONS[index])}
          </button>
          {onClear && clearLabel && (
            <button type="button" onClick={onClear} className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer">
              {clearLabel}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
