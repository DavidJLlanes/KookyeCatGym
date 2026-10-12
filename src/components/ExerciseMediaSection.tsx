import React, { useState } from 'react';
import { Camera, ImagePlus, Star, Trash2, AlertCircle } from 'lucide-react';
import type { MediaItem } from '../api/client';
import { useLightbox } from '../context/LightboxContext';
import MediaDateBadge from './MediaDateBadge';

interface ExerciseMediaSectionProps {
  exerciseName: string;
  items: MediaItem[];
  onUpload: (file: File, onProgress: (fraction: number) => void) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetPrimary: (id: string) => Promise<void>;
}

export default function ExerciseMediaSection({ exerciseName, items, onUpload, onDelete, onSetPrimary }: ExerciseMediaSectionProps) {
  const { openLightbox } = useLightbox();
  const [progress, setProgress] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    try {
      for (const file of Array.from(files)) {
        setProgress(0);
        await onUpload(file, setProgress);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el archivo.');
    } finally {
      setProgress(null);
    }
  };

  const run = async (id: string, action: () => Promise<void>) => {
    setError(null);
    setBusyId(id);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Tus fotos y vídeos</h4>

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {items.map((m) => {
            const isImage = m.mime.startsWith('image/');
            return (
              <div
                key={m.id}
                className={`relative aspect-square rounded-xl overflow-hidden bg-slate-950 border ${
                  m.isPrimary ? 'border-amber-400' : 'border-slate-800'
                } ${busyId === m.id ? 'opacity-50' : ''}`}
              >
                {isImage ? (
                  <img
                    src={m.url}
                    alt={exerciseName}
                    loading="lazy"
                    onClick={() => openLightbox(m.url, exerciseName)}
                    className="w-full h-full object-cover cursor-zoom-in"
                  />
                ) : (
                  <video src={m.url} controls playsInline preload="metadata" className="w-full h-full object-cover bg-black" />
                )}
                <MediaDateBadge date={m.createdAt} />
                {/* Arriba va la fecha; en las fotos los botones bajan para no taparla
                    (en los vídeos abajo están los controles y solo hay papelera) */}
                <div className={`absolute right-1 flex gap-1 ${isImage ? 'bottom-1' : 'top-1'}`}>
                  {isImage && (
                    <button
                      type="button"
                      disabled={busyId !== null || m.isPrimary}
                      onClick={() => run(m.id, () => onSetPrimary(m.id))}
                      title={m.isPrimary ? 'Imagen principal del ejercicio' : 'Usar como imagen del ejercicio'}
                      className="p-1 rounded-lg bg-slate-950/80 cursor-pointer"
                    >
                      <Star className={`h-3.5 w-3.5 ${m.isPrimary ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => run(m.id, () => onDelete(m.id))}
                    title="Eliminar"
                    className="p-1 rounded-lg bg-slate-950/80 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-300" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.some((m) => m.isPrimary) && (
        <p className="text-[11px] text-slate-500">
          La foto con la estrella es la que se muestra para este ejercicio en toda la app.
        </p>
      )}

      {progress !== null ? (
        <div className="space-y-1">
          <div className="text-xs text-slate-400">Subiendo… {Math.round(progress * 100)}%</div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-2">
            {/* capture="environment": abre directamente la cámara trasera en Android y iPhone */}
            <label className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white cursor-pointer transition-colors">
              <Camera className="h-4 w-4" />
              Hacer foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
            {/* Sin capture: abre la galería/carrete; se pueden elegir varias fotos y vídeos */}
            <label className="flex items-center justify-center gap-2 py-3 border border-slate-700 hover:border-blue-500 bg-slate-900 rounded-xl text-xs font-bold text-slate-200 cursor-pointer transition-colors">
              <ImagePlus className="h-4 w-4 text-blue-400" />
              Desde la galería
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <p className="text-[11px] text-slate-500 text-center">Fotos y vídeos de hasta 50 MB.</p>
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/30 flex gap-2 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
