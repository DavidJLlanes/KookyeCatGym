import React, { useEffect, useRef, useState } from 'react';
import { Camera, Download, ImagePlus, Share2 } from 'lucide-react';
import type { WorkoutLog } from '../../types';
import { canNativeShare, saveImage, shareCanvas } from '../../utils/shareCanvas';
import { STICKER_H, STICKER_W, clampCenter, renderStickerOnPhoto } from '../../utils/shareSticker';

interface Props {
  log: WorkoutLog;
  hasRecord: boolean;
}

const FILE = 'kookyecatgym-pegatina.png';
const TITLE = 'Mi entrenamiento en KookyeCatGym';

/**
 * Pone el resumen del entrenamiento como pegatina sobre una foto: se elige o
 * se hace la foto, se arrastra la pegatina y se ajusta su tamaño. El lienzo es
 * lo que se ve y lo que se exporta (1080×1350).
 */
export default function PhotoStickerEditor({ log, hasRecord }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [pos, setPos] = useState({ cx: 0.5, cy: 0.8 });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    // Solo se pinta: el PNG se genera al descargar o compartir, no en cada movimiento del dedo
    if (canvasRef.current) renderStickerOnPhoto(canvasRef.current, { log, hasRecord, photo, ...pos, scale });
  }, [log, hasRecord, photo, pos, scale]);

  const onFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setPhoto(img);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  // Posición del puntero en fracciones del lienzo (0-1)
  const toFraction = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const onDown = (e: React.PointerEvent) => {
    const p = toFraction(e);
    drag.current = { dx: pos.cx - p.x, dy: pos.cy - p.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = toFraction(e);
    setPos(clampCenter(p.x + drag.current.dx, p.y + drag.current.dy, scale));
  };
  const onUp = () => {
    drag.current = null;
  };
  const changeScale = (v: number) => {
    setScale(v);
    setPos((cur) => clampCenter(cur.cx, cur.cy, v));
  };

  const pickBtn = 'flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer';

  return (
    <div className="space-y-4">
      <div className="flex gap-2.5">
        <label className={pickBtn}>
          <ImagePlus className="h-3.5 w-3.5" /> Elegir foto
          <input type="file" accept="image/*" className="sr-only" aria-label="Elegir foto de la galería" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <label className={pickBtn}>
          <Camera className="h-3.5 w-3.5" /> Hacer foto
          <input type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Hacer una foto" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </div>

      <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
        <canvas
          ref={canvasRef}
          id="sticker-canvas"
          width={STICKER_W}
          height={STICKER_H}
          className="w-full h-auto block touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="img"
          aria-label="Foto con la pegatina del entrenamiento. Arrástrala para moverla."
        />
      </div>
      <p className="text-[11px] text-slate-500 -mt-2">Arrastra la pegatina para colocarla.{!photo && ' Sin foto se usa un fondo liso.'}</p>

      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tamaño</span>
        <input type="range" min={0.5} max={1.6} step={0.05} value={scale} onChange={(e) => changeScale(Number(e.target.value))} className="w-full accent-blue-500" aria-label="Tamaño de la pegatina" />
      </label>

      <div className="flex gap-2.5">
        {canNativeShare() && (
          <button type="button" onClick={() => canvasRef.current && shareCanvas(canvasRef.current, FILE, TITLE, canvasRef.current.toDataURL('image/png'))} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer">
            <Share2 className="h-3.5 w-3.5" /> Compartir
          </button>
        )}
        <button
          type="button"
          onClick={() => canvasRef.current && saveImage(canvasRef.current, FILE, TITLE, canvasRef.current.toDataURL('image/png'))}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" /> Descargar
        </button>
      </div>
    </div>
  );
}
