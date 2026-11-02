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

// Ancho de la zona difuminada de cada borde: lo que debe quedar libre para que
// un elemento no se vea tapado por la flecha.
const EDGE = 52;

/**
 * Fila que se desplaza hacia los lados y lo deja claro: el borde por el que sigue
 * habiendo contenido se difumina y muestra una flecha. Cada pulsación de la flecha
 * trae el siguiente elemento (o el anterior) entero a la vista, no un salto
 * arbitrario. Si hay un elemento activo ([aria-selected="true"] o
 * [aria-current="true"]), la fila se coloca para que se vea al cambiar de uno a otro.
 */
export default function ScrollRow({ children, className = '', scrollerClassName = '', fadeFrom = 'from-slate-950', scrollerRef, scrollerProps }: ScrollRowProps) {
  const ownRef = useRef<HTMLDivElement | null>(null);
  const ref = (scrollerRef ?? ownRef) as React.MutableRefObject<HTMLDivElement | null>;
  const lastActive = useRef<Element | null>(null);
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

  // Solo cuando cambia el elemento activo (no en cada repintado, que pelearía con
  // las flechas y con el dedo): se asegura de que quede a la vista, sin saltos si ya lo está.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const active = el.querySelector<HTMLElement>('[aria-selected="true"], [aria-current="true"]');
    if (!active || active === lastActive.current) return;
    lastActive.current = active;
    const left = active.offsetLeft;
    const right = left + active.offsetWidth;
    const viewLeft = el.scrollLeft;
    const viewRight = viewLeft + el.clientWidth;
    const needLeft = viewLeft > 0 ? EDGE : 0;
    const needRight = viewRight < el.scrollWidth - 2 ? EDGE : 0;
    if (left - needLeft < viewLeft) el.scrollTo({ left: Math.max(0, left - EDGE), behavior: 'smooth' });
    else if (right + needRight > viewRight) el.scrollTo({ left: right + EDGE - el.clientWidth, behavior: 'smooth' });
  });

  const go = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    // Con varios elementos pequeños (pestañas, chips): se trae el siguiente o el anterior entero
    if (items.length >= 3) {
      const viewLeft = el.scrollLeft;
      const viewRight = viewLeft + el.clientWidth;
      if (dir === 1) {
        const next = items.find((it) => it.offsetLeft + it.offsetWidth > viewRight - 2);
        if (next) {
          el.scrollTo({ left: Math.min(el.scrollWidth - el.clientWidth, next.offsetLeft + next.offsetWidth + EDGE - el.clientWidth), behavior: 'smooth' });
          return;
        }
      } else {
        const prev = [...items].reverse().find((it) => it.offsetLeft < viewLeft + 2);
        if (prev) {
          el.scrollTo({ left: Math.max(0, prev.offsetLeft - EDGE), behavior: 'smooth' });
          return;
        }
      }
    }
    // Contenido continuo (mapa de actividad, tabla...): casi una pantalla
    el.scrollBy({ left: dir * Math.max(120, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  const { className: innerClass = '', ...restProps } = scrollerProps ?? {};
  const arrow =
    'pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-slate-100 shadow-lg shadow-black/40 cursor-pointer transition-colors hover:border-blue-500 hover:bg-slate-700 active:scale-95';

  return (
    <div className={`relative ${className}`}>
      <div ref={ref} className={`relative overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${scrollerClassName} ${innerClass}`} {...restProps}>
        {children}
      </div>

      {canLeft && (
        <div className={`pointer-events-none absolute inset-y-0 left-0 z-10 flex w-14 items-center justify-start bg-gradient-to-r ${fadeFrom} from-40% to-transparent pl-1`}>
          <button type="button" tabIndex={-1} aria-label="Ver lo anterior" onClick={() => go(-1)} className={arrow}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {canRight && (
        <div className={`pointer-events-none absolute inset-y-0 right-0 z-10 flex w-14 items-center justify-end bg-gradient-to-l ${fadeFrom} from-40% to-transparent pr-1`}>
          <button type="button" tabIndex={-1} aria-label="Ver más" onClick={() => go(1)} className={arrow}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
