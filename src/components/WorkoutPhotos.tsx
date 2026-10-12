import React, { useState } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import type { MediaItem } from '../api/client';
import PhotoCaptureButtons from './PhotoCaptureButtons';
import PhotoTile from './PhotoTile';
import { byTakenAt } from '../utils/photoTools';

// Fotos de un entrenamiento: en la tarjeta del historial y en el entrenamiento
// activo. Iconos de cámara y galería para añadir en cualquier momento.

interface WorkoutPhotosProps {
  title: string;
  photos: MediaItem[];
  onUpload: (file: File, onProgress: (fraction: number) => void) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  // En el entrenamiento activo se muestran los botones aunque aún no haya fotos
  alwaysShowHeader?: boolean;
}

export default function WorkoutPhotos({ title, photos, onUpload, onDelete, alwaysShowHeader = true }: WorkoutPhotosProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sorted = [...photos].sort(byTakenAt);

  const handleFiles = async (files: File[]) => {
    setError(null);
    try {
      for (const file of files) {
        setProgress(0);
        await onUpload(file, setProgress);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto.');
    } finally {
      setProgress(null);
    }
  };

  if (!alwaysShowHeader && sorted.length === 0 && progress === null) {
    return <PhotoCaptureButtons compact allowVideo onFiles={handleFiles} />;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <Camera className="h-3.5 w-3.5 text-blue-400" />
          Fotos {sorted.length > 0 && `(${sorted.length})`}
        </span>
        <PhotoCaptureButtons compact allowVideo onFiles={handleFiles} disabled={progress !== null} />
      </div>

      {progress !== null && (
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${Math.max(5, progress * 100)}%` }} />
        </div>
      )}

      {sorted.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {sorted.map((p) => (
            <PhotoTile key={p.id} item={p} alt={title} onDelete={onDelete} />
          ))}
        </div>
      )}

      {error && (
        <div className="p-2 rounded-lg bg-red-950/30 border border-red-500/30 flex gap-2 text-[11px] text-red-300">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
