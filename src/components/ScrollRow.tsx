import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScrollRowProps {
  children: React.ReactNode;
  /** Clases del contenedor exterior. */
  className?: string;
  /** Clases de la zona que se desplaza (aquí va el flex, los huecos, etc.). */
  scrollerClassName?: string;
  /** Color desde el que se difumina el borde: debe coincidir con el fondo que hay detrás. */
  fadeFrom?: string;
  /** Si se da, se usa esta referencia para la zona que se desplaza (p. ej. para arrastrar con el ratón). */
  scrollerRef?: React.RefObject<HTMLDivElement | null>;
  /** Atributos extra de la zona que se desplaza (id, role, manejadores...). */
  scrollerProps?: React.HTMLAttributes<HTMLDivElement>;
}

/**
 * Fila que se desplaza hacia los lados y lo deja claro: se difumina el borde por
 * el que sigue habiendo contenido y aparece una flecha táctil para ir hacia allí.
 * Si hay un elemento activo ([aria-selected="true"] o [aria-current="true"]), la
 * fila se coloca sola para que se vea.
 */
export default function ScrollRow({ children, className = '', scrollerClassName = '', fadeFrom = 'from-slate-950', scrollerRef, scrollerProps, }: ScrollRowProps) {
  const ownRef = useRef<HTMLDivElement | null>(null);
  const ref = (scrollerRef ?? ownRef) as React.MutableRefObject<HTMLDivElement | null>;
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    if (el.firstElementChild) ro?.observe(el.firstElementChild);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [ref, update]);

  // Cada vez que cambia el contenido: se recalcula y se centra el elemento activo
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const active = el.querySelector<HTMLElement>('[aria-selected="true"], [aria-current="true"]');
    if (active) {
      const target = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
      el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }
  });

  const go = (dir: -1 | 1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(120, el.clientWidth * 0.7), behavior: 'smooth' });
  };

  const { className: innerClass = '', ...restProps } = scrollerProps ?? {};
  const arrow = 'absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-600 bg-slate-800/95 text-slate-100 shadow-lg cursor-pointer hover:bg-slate-700';

  return (
    <div className={`relative ${className}`}>
      <div ref={ref} className={`relative overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${scrollerClassName} ${innerClass}`} {...restProps}>
        {children}
      </div>

      {canLeft && (
        <>
          <div aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-0 z-[5] w-10 bg-gradient-to-r ${fadeFrom} to-transparent`} />
          <button type="button" tabIndex={-1} aria-label="Ver lo anterior" onClick={() => go(-1)} className={`${arrow} left-0.5`}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      )}
      {canRight && (
        <>
          <div aria-hidden="true" className={`pointer-events-none absolute inset-y-0 right-0 z-[5] w-10 bg-gradient-to-l ${fadeFrom} to-transparent`} />
          <button type="button" tabIndex={-1} aria-label="Ver más" onClick={() => go(1)} className={`${arrow} right-0.5`}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
