import { Dispatch, SetStateAction } from 'react';
import { WorkoutLog } from '../types';
import * as api from '../api/client';
import { prepareMediaUpload } from '../utils/mediaUpload';
import { localDay } from '../utils/photoTools';

/** Subir, actualizar, marcar como principal y borrar las fotos y vídeos propios. */
export function useMediaActions(logs: WorkoutLog[], setExerciseMedia: Dispatch<SetStateAction<api.MediaItem[]>>) {
  // --- FOTOS Y VÍDEOS PROPIOS ---
  const handleUploadMedia = async (exerciseId: string, file: File, onProgress: (fraction: number) => void) => {
    const { blob, fileName } = await prepareMediaUpload(file);
    const item = await api.uploadMedia(blob, fileName, { kind: 'exercise', exerciseId }, onProgress);
    setExerciseMedia((prev) => [...prev.filter((m) => m.id !== item.id), item]);
  };

  // Foto de un entrenamiento (del historial o el que está en curso). Su fecha es
  // la del entrenamiento, para que salga en ese día del calendario de Fotos.
  const handleUploadWorkoutPhoto = async (logId: string, file: File, onProgress: (fraction: number) => void) => {
    const { blob, fileName } = await prepareMediaUpload(file);
    const log = logs.find((l) => l.id === logId);
    const takenAt = log ? localDay(new Date(log.date)) : localDay();
    const item = await api.uploadMedia(blob, fileName, { kind: 'workout', logId, takenAt }, onProgress);
    setExerciseMedia((prev) => [...prev.filter((m) => m.id !== item.id), item]);
  };

  const handleUploadProgressPhoto = async (
    target: Extract<api.MediaTarget, { kind: 'progress' }>,
    file: File,
    onProgress: (fraction: number) => void
  ) => {
    const { blob, fileName } = await prepareMediaUpload(file);
    const item = await api.uploadMedia(blob, fileName, target, onProgress);
    setExerciseMedia((prev) => [...prev.filter((m) => m.id !== item.id), item]);
  };

  const handleUpdatePhoto = async (id: string, changes: Parameters<typeof api.updateMedia>[1]) => {
    const item = await api.updateMedia(id, changes);
    setExerciseMedia((prev) => prev.map((m) => (m.id === item.id ? item : m)));
  };

  // Tras marcar o borrar, se recarga la lista: el servidor decide qué foto queda como principal
  const refreshMedia = async () => setExerciseMedia(await api.getMyMedia());

  const handleSetPrimaryMedia = async (id: string) => {
    await api.setPrimaryMedia(id);
    await refreshMedia();
  };

  const handleDeleteMedia = async (id: string) => {
    await api.deleteMedia(id);
    await refreshMedia();
  };

  return {
    handleUploadMedia,
    handleUploadWorkoutPhoto,
    handleUploadProgressPhoto,
    handleUpdatePhoto,
    handleSetPrimaryMedia,
    handleDeleteMedia,
  };
}
