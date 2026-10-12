import React from 'react';
import { Camera, ImagePlus } from 'lucide-react';

// Botones "Hacer foto" (abre la cámara trasera en Android y iPhone) y
// "Galería" (carrete; se pueden elegir varias). Versión compacta de solo
// iconos para las tarjetas del historial y el entrenamiento activo.

interface PhotoCaptureButtonsProps {
  onFiles: (files: File[]) => void;
  compact?: boolean;
  allowVideo?: boolean;
  disabled?: boolean;
}

export default function PhotoCaptureButtons({ onFiles, compact = false, allowVideo = false, disabled = false }: PhotoCaptureButtonsProps) {
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length > 0) onFiles(files);
  };

  const base = `flex items-center justify-center gap-1.5 font-bold transition-colors ${
    disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
  }`;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <label title="Hacer foto" className={`${base} p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800`}>
          <Camera className="h-4 w-4" />
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} disabled={disabled} />
        </label>
        <label title="Subir desde la galería" className={`${base} p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800`}>
          <ImagePlus className="h-4 w-4" />
          <input type="file" accept={allowVideo ? 'image/*,video/*' : 'image/*'} multiple className="hidden" onChange={pick} disabled={disabled} />
        </label>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className={`${base} py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs text-white`}>
        <Camera className="h-4 w-4" />
        Hacer foto
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} disabled={disabled} />
      </label>
      <label className={`${base} py-3 border border-slate-700 hover:border-blue-500 bg-slate-900 rounded-xl text-xs text-slate-200`}>
        <ImagePlus className="h-4 w-4 text-blue-400" />
        Desde la galería
        <input type="file" accept={allowVideo ? 'image/*,video/*' : 'image/*'} multiple className="hidden" onChange={pick} disabled={disabled} />
      </label>
    </div>
  );
}
