import React, { useState } from 'react';

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel: string;
  afterLabel: string;
  alt: string;
}

/**
 * Dos fotos superpuestas con un deslizador: a la izquierda se ve la de antes y
 * a la derecha la de ahora. Se arrastra con el dedo o con el ratón, y el
 * control accesible es un <input type="range"> (también funciona con teclado).
 */
export default function BeforeAfterSlider({ beforeUrl, afterUrl, beforeLabel, afterLabel, alt }: BeforeAfterSliderProps) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[3/4] w-full max-w-sm mx-auto rounded-xl overflow-hidden bg-slate-950 border border-slate-800 select-none touch-pan-y">
      <img src={afterUrl} alt={`${alt}: ${afterLabel}`} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <img
        src={beforeUrl}
        alt={`${alt}: ${beforeLabel}`}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />
      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] font-black text-white">{beforeLabel}</span>
      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] font-black text-white">{afterLabel}</span>
      <div className="absolute inset-y-0 w-0.5 bg-white/90 shadow pointer-events-none" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-white text-slate-900 text-xs font-black grid place-items-center shadow-lg">⇆</div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Comparar antes y ahora"
        className="absolute inset-0 h-full w-full opacity-0 cursor-ew-resize touch-pan-y"
      />
    </div>
  );
}
