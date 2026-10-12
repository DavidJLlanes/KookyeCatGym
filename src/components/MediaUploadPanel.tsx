import React, { useRef, useState } from 'react';
import { Upload, Camera, Video, Trash2, Image as ImageIcon } from 'lucide-react';
import { MediaFile, formatFileSize } from '../utils/mediaManager';

interface MediaUploadPanelProps {
  exerciseName?: string;
  onMediaSelect?: (file: File, type: 'photo' | 'video') => void;
  existingMedia?: MediaFile[];
  onRemoveMedia?: (fileId: string) => void;
}

export default function MediaUploadPanel({
  exerciseName,
  onMediaSelect,
  existingMedia = [],
  onRemoveMedia,
}: MediaUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    const isPhoto = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (isPhoto || isVideo) {
      const type = isPhoto ? 'photo' : 'video';
      onMediaSelect?.(file, type);
      setUploadProgress(null);
    } else {
      alert('Solo se aceptan fotos y videos');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const triggerFileInput = (type: 'photo' | 'video') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'photo' ? 'image/*' : 'video/*';
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3">
      {/* Title */}
      {exerciseName && (
        <div className="text-sm font-bold text-slate-300">{exerciseName}</div>
      )}

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`p-4 rounded-lg border-2 border-dashed transition cursor-pointer ${
          dragActive
            ? 'border-blue-500 bg-blue-950/20'
            : 'border-slate-700 bg-slate-950 hover:border-slate-600'
        }`}
        onClick={() => triggerFileInput('photo')}
      >
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          <Upload className="h-8 w-8 text-slate-400" />
          <div className="text-sm font-bold text-slate-300 text-center">
            Arrastra o haz clic para subir media
          </div>
          <div className="text-xs text-slate-500">Fotos (JPG, PNG) o videos (MP4, WebM)</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => triggerFileInput('photo')}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
        >
          <Camera className="h-4 w-4" />
          Foto
        </button>
        <button
          onClick={() => triggerFileInput('video')}
          className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
        >
          <Video className="h-4 w-4" />
          Video
        </button>
      </div>

      {/* Hidden Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Upload Progress */}
      {uploadProgress !== null && (
        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
          <div className="text-xs text-slate-400 mb-2">Subiendo...</div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Existing Media Gallery */}
      {existingMedia.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-400">Media existente:</div>
          <div className="grid grid-cols-2 gap-2">
            {existingMedia.map((media) => (
              <div
                key={media.id}
                className="relative p-2 bg-slate-900 rounded-lg border border-slate-800 group"
              >
                {/* Media Preview Icon */}
                <div className="flex items-center justify-center h-16 bg-slate-950 rounded mb-2">
                  {media.type === 'photo' ? (
                    <ImageIcon className="h-6 w-6 text-slate-500" />
                  ) : (
                    <Video className="h-6 w-6 text-slate-500" />
                  )}
                </div>

                {/* Info */}
                <div className="text-xs text-slate-400">
                  <div className="capitalize font-bold text-slate-300">{media.type}</div>
                  <div>{formatFileSize(media.size)}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {new Date(media.uploadedAt).toLocaleDateString('es-ES')}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => onRemoveMedia?.(media.id)}
                  className="absolute top-1 right-1 p-1 bg-red-950/40 hover:bg-red-900/40 text-red-400 rounded opacity-0 group-hover:opacity-100 transition"
                  title="Eliminar"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {existingMedia.length === 0 && (
        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-center text-xs text-slate-500">
          Sin media subida aún
        </div>
      )}

      {/* Tips */}
      <div className="p-2 bg-slate-900/50 rounded text-xs text-slate-400 space-y-1">
        <strong className="text-slate-300 block">💡 Tips:</strong>
        <div>• Las fotos se comprimen automáticamente</div>
        <div>• Máximo 50MB por archivo</div>
        <div>• Útil para documentar forma correcta</div>
      </div>
    </div>
  );
}
