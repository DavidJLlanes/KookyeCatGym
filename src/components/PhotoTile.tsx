import React, { useEffect, useState } from 'react';
import { Trash2, Pencil, Play } from 'lucide-react';
import type { MediaItem } from '../api/client';
import { useLightbox } from '../context/LightboxContext';
import MediaDateBadge from './MediaDateBadge';

// Miniatura de una foto o vídeo con su fecha. Borrar pide un segundo toque
// ("¿Borrar?") para evitar sustos; se puede borrar cualquier foto.

interface PhotoTileProps {
  item: MediaItem;
  alt: string;
  onDelete: (id: string) => Promise<void>;
  onEdit?: () => void;
  caption?: React.ReactNode;
  className?: string;
}

export default function PhotoTile({ item, alt, onDelete, onEdit, caption, className = '' }: PhotoTileProps) {
  const { openLightbox } = useLightbox();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const isImage = item.mime.startsWith('image/');
  const date = item.kind === 'exercise' ? item.createdAt : item.takenAt;

  // El "¿Borrar?" se cancela solo si no se confirma en unos segundos
  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  const remove = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    try {
      await onDelete(item.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo borrar la foto.');
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div className={`relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 ${busy ? 'opacity-40' : ''} ${className}`}>
      <div className="aspect-square">
        {isImage ? (
          <img
            src={item.url}
            alt={alt}
            loading="lazy"
            onClick={() => openLightbox(item.url, alt)}
            className="w-full h-full object-cover cursor-zoom-in"
          />
        ) : (
          <div className="relative w-full h-full">
            <video src={item.url} controls playsInline preload="metadata" className="w-full h-full object-cover bg-black" />
            <Play className="absolute right-1.5 bottom-1.5 h-3.5 w-3.5 text-white/70 pointer-events-none" />
          </div>
        )}
      </div>

      <MediaDateBadge date={date} label={item.kind === 'exercise' ? 'Subida el' : 'Foto del'} />

      <div className="absolute top-1.5 right-1.5 flex gap-1">
        {onEdit && !confirming && (
          <button
            type="button"
            onClick={onEdit}
            title="Editar fecha y medida"
            className="p-1.5 rounded-lg bg-slate-950/80 backdrop-blur-sm text-slate-300 hover:text-blue-400 cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          title="Borrar"
          className={`flex items-center gap-1 p-1.5 rounded-lg backdrop-blur-sm text-[10px] font-black cursor-pointer transition-colors ${
            confirming ? 'bg-rose-600 text-white px-2' : 'bg-slate-950/80 text-slate-300 hover:text-rose-400'
          }`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {confirming && '¿Borrar?'}
        </button>
      </div>

      {caption && (
        <div className="absolute inset-x-0 bottom-0 px-2 pt-5 pb-1.5 bg-gradient-to-t from-black/85 to-transparent text-[11px] text-white pointer-events-none">
          {caption}
        </div>
      )}
    </div>
  );
}
