import React, { useRef, useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';

interface SwipeRowProps {
  /** Deslizar a la izquierda (borrar). Si falta, ese lado no hace nada. */
  onSwipeLeft?: () => void;
  /** Deslizar a la derecha (copiar). */
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const COMMIT_PX = 84; // a partir de aquí, al soltar, se ejecuta la acción
const START_PX = 10; // movimiento mínimo para decidir que es un deslizamiento
const MAX_PX = 140;

/**
 * Fila deslizable: a la izquierda ejecuta `onSwipeLeft` (borrar), a la derecha
 * `onSwipeRight` (copiar). El scroll vertical de la página sigue funcionando
 * (touch-action: pan-y) y un deslizamiento que empieza en un campo de texto se
 * ignora, para no estorbar al escribir. Los botones de siempre siguen ahí.
 */
export default function SwipeRow({ onSwipeLeft, onSwipeRight, leftLabel = 'Borrar', rightLabel = 'Copiar', className = '', style, children }: SwipeRowProps) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const locked = useRef(false);

  const reset = () => {
    start.current = null;
    locked.current = false;
    setDragging(false);
    setDx(0);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = e.target as HTMLElement;
    if (el.closest('input, textarea, select, button, a, [role="checkbox"]')) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const moveX = e.clientX - s.x;
    const moveY = e.clientY - s.y;
    if (!locked.current) {
      if (Math.abs(moveY) > START_PX && Math.abs(moveY) > Math.abs(moveX)) {
        start.current = null; // es un scroll vertical
        return;
      }
      if (Math.abs(moveX) < START_PX || Math.abs(moveX) < Math.abs(moveY) * 1.5) return;
      locked.current = true;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    let next = Math.max(-MAX_PX, Math.min(MAX_PX, moveX));
    if (next < 0 && !onSwipeLeft) next = 0;
    if (next > 0 && !onSwipeRight) next = 0;
    setDx(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return reset();
    const committed = locked.current ? dx : 0;
    reset();
    if (committed <= -COMMIT_PX) onSwipeLeft?.();
    else if (committed >= COMMIT_PX) onSwipeRight?.();
  };

  const armed = Math.abs(dx) >= COMMIT_PX;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {dx !== 0 && (
        <div className={`absolute inset-0 flex items-center px-4 text-xs font-black ${dx < 0 ? 'justify-end bg-rose-600/90 text-white' : 'justify-start bg-emerald-600/90 text-white'} ${armed ? 'opacity-100' : 'opacity-70'}`} aria-hidden="true">
          {dx < 0 ? (
            <span className="flex items-center gap-1.5"><Trash2 className="h-4 w-4" />{leftLabel}</span>
          ) : (
            <span className="flex items-center gap-1.5"><Copy className="h-4 w-4" />{rightLabel}</span>
          )}
        </div>
      )}
      <div
        className={className}
        style={{ ...style, touchAction: 'pan-y', transform: dx ? `translateX(${dx}px)` : undefined, transition: dragging ? 'none' : 'transform 160ms ease-out', position: 'relative', backgroundColor: dx ? '#0f172a' : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={reset}
      >
        {children}
      </div>
    </div>
  );
}
