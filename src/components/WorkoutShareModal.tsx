import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2 } from 'lucide-react';
import { WorkoutLog, Exercise } from '../types';
import { saveImage, canNativeShare, shareCanvas } from '../utils/shareCanvas';
import { renderWorkoutCard, ShareVariant } from '../utils/shareCards';
import PhotoStickerEditor from './share/PhotoStickerEditor';

interface WorkoutShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: WorkoutLog;
  exercises: Exercise[];
  hasRecord: boolean; // récord real batido en esta sesión
}

export default function WorkoutShareModal({ isOpen, onClose, log, exercises, hasRecord }: WorkoutShareModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [nativeOk, setNativeOk] = useState(false);
  const [variant, setVariant] = useState<ShareVariant>('compact');
  // 'card' = tarjeta de resumen; 'photo' = pegatina sobre una foto
  const [mode, setMode] = useState<'card' | 'photo'>('card');

  useEffect(() => {
    if (isOpen) {
      setVariant('compact');
      setMode('card');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || mode !== 'card') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setNativeOk(canNativeShare());
    setPreviewUrl('');
    let cancelled = false;
    renderWorkoutCard(canvas, { log, exercises, hasRecord, variant }).then((url) => {
      if (!cancelled) setPreviewUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, log, exercises, hasRecord, variant, mode]);

  const handleDownload = () => {
    if (previewUrl && canvasRef.current)
      saveImage(canvasRef.current, 'kookyecatgym-entrenamiento.png', 'Mi entrenamiento en KookyeCatGym', previewUrl);
  };
  const handleShare = () => {
    if (canvasRef.current) shareCanvas(canvasRef.current, 'kookyecatgym-entrenamiento.png', 'Mi entrenamiento en KookyeCatGym', previewUrl);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/85 z-[110] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
              <h3 className="font-extrabold text-white text-sm">Compartir entrenamiento</h3>
              <button
                type="button"
                onClick={onClose}
                title="Cerrar"
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Qué compartir: la tarjeta de resumen o una pegatina sobre tu foto */}
            <div role="tablist" aria-label="Qué compartir" className="flex gap-1.5 p-1.5 mx-5 mt-4 bg-slate-950 border border-slate-850 rounded-xl">
              {([['card', 'Tarjeta'], ['photo', 'Sobre una foto']] as const).map(([id, text]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  onClick={() => setMode(id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${mode === id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {text}
                </button>
              ))}
            </div>

            {mode === 'photo' ? (
              <div className="p-5 overflow-y-auto">
                <PhotoStickerEditor log={log} hasRecord={hasRecord} />
              </div>
            ) : (
              <>
            {/* Versión: compacta o completa (con desglose de ejercicios) */}
            <div className="flex gap-1.5 p-1.5 mx-5 mt-4 bg-slate-950 border border-slate-850 rounded-xl">
              <button
                type="button"
                onClick={() => setVariant('compact')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  variant === 'compact' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Compacta
              </button>
              <button
                type="button"
                onClick={() => setVariant('full')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  variant === 'full' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Completa
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                <canvas ref={canvasRef} className="hidden" />
                {previewUrl ? (
                  <img id="workout-share-preview" src={previewUrl} alt="Resumen de entrenamiento KookyeCatGym" className="w-full h-auto block" />
                ) : (
                  <div className="aspect-[4/5] flex items-center justify-center text-slate-500 text-xs font-semibold">
                    Generando imagen…
                  </div>
                )}
              </div>

              <div className="flex gap-2.5">
                {nativeOk && (
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Compartir
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownload}
                  className={`flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer ${nativeOk ? 'px-4' : 'flex-1'}`}
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar
                </button>
              </div>
            </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
