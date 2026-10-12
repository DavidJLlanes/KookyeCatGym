import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Menú flotante junto a un botón. Se pinta en <body> (portal) con posición fija
// para que no lo recorten las tarjetas con overflow-hidden ni lo desplacen los
// paneles animados; se abre encima del botón si cabe y, si no, debajo.

interface AnchoredPopoverProps {
  anchor: HTMLElement;
  onClose: () => void;
  align?: 'left' | 'right';
  width: number;
  children: React.ReactNode;
}

const MARGIN = 8;

export default function AnchoredPopover({ anchor, onClose, align = 'left', width, children }: AnchoredPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const height = ref.current?.offsetHeight ?? 0;
    const fitsAbove = rect.top - height - MARGIN >= MARGIN;
    const top = fitsAbove ? rect.top - height - 4 : Math.min(rect.bottom + 4, window.innerHeight - height - MARGIN);
    const rawLeft = align === 'left' ? rect.left : rect.right - width;
    const left = Math.max(MARGIN, Math.min(rawLeft, window.innerWidth - width - MARGIN));
    setPos({ top, left });
  }, [anchor, align, width]);

  // Al desplazar la pantalla la posición ya no vale: se cierra
  useLayoutEffect(() => {
    const close = () => onClose();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [onClose]);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div
        ref={ref}
        style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
        className="fixed z-[91] p-1.5 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl shadow-black/50"
      >
        {children}
      </div>
    </>,
    document.body
  );
}
