import React, { useState} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, X, Brain, Play } from 'lucide-react';
import { Exercise} from '../../types';
import { getMuscleColor } from '../../data/exerciseMeta';
import ExerciseMuscleView from './ExerciseMuscleView';
import { useLightbox } from '../../context/LightboxContext';
import ExerciseMediaSection from '../ExerciseMediaSection';
import type { MediaItem } from '../../api/client';

interface ExerciseDetailModalProps {
  viewingExercise: Exercise | null;
  onClose: () => void;
  media?: MediaItem[];
  onUploadMedia?: (exerciseId: string, file: File, onProgress: (fraction: number) => void) => Promise<void>;
  onDeleteMedia?: (id: string) => Promise<void>;
  onSetPrimaryMedia?: (id: string) => Promise<void>;
}

/** Ficha de un ejercicio: animación o foto real, músculos, instrucciones y medios propios. */
export default function ExerciseDetailModal({
  viewingExercise, onClose, media, onUploadMedia, onDeleteMedia, onSetPrimaryMedia,
}: ExerciseDetailModalProps) {
  const { openLightbox } = useLightbox();
  const [viewingMode, setViewingMode] = useState<'demo' | 'muscle'>('muscle');
  return (
  <AnimatePresence>
    {viewingExercise && (
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-900 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-800 max-h-[85dvh] flex flex-col"
        >
          {/* Selector de modo: grupo muscular o demostración del movimiento */}
          <div className="flex bg-slate-950 border-b border-slate-850 p-3.5 text-xs font-semibold gap-2.5 relative">
            <div className="flex gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800/50 flex-grow">
              <button
                type="button"
                onClick={() => setViewingMode('muscle')}
                className={`flex-grow py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  viewingMode === 'muscle'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Brain className="h-3.5 w-3.5 text-blue-200" />
                Grupo muscular
              </button>
              <button
                type="button"
                onClick={() => setViewingMode('demo')}
                className={`flex-grow py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  viewingMode === 'demo'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Play className="h-3.5 w-3.5 text-blue-200" />
                Demostración
              </button>
            </div>
            <button
              type="button"
              onClick={() => onClose()}
              className="bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 p-2.5 rounded-xl transition-all cursor-pointer border border-slate-800/85 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Contenido Visual Condicional */}
          <div className="relative">
            {viewingMode === 'demo' ? (
              <div className="relative h-[min(340px,40dvh)] w-full bg-slate-950">
                {viewingExercise.videoUrl ? (
                  <video
                    key={viewingExercise.videoUrl}
                    src={viewingExercise.videoUrl}
                    poster={viewingExercise.imageUrl}
                    aria-label={viewingExercise.name}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onClick={() => openLightbox(viewingExercise.imageUrl, viewingExercise.name, viewingExercise.videoUrl)}
                    className="w-full h-full object-contain cursor-zoom-in bg-white"
                  />
                ) : (
                  <img
                    src={viewingExercise.imageUrl}
                    alt={viewingExercise.name}
                    referrerPolicy="no-referrer"
                    onClick={() => openLightbox(viewingExercise.imageUrl, viewingExercise.name)}
                    className="w-full h-full object-contain cursor-zoom-in"
                  />
                )}
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-md"
                    style={{ backgroundColor: getMuscleColor(viewingExercise.muscleGroup) }}
                  >
                    {viewingExercise.muscleGroup}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold text-slate-200 bg-slate-950/90 backdrop-blur-sm border border-slate-800/80">
                    {viewingExercise.equipment}
                  </span>
                </div>
              </div>
            ) : (
              <div className="border-b border-slate-800/40">
                <ExerciseMuscleView exercise={viewingExercise} />
              </div>
            )}
          </div>

          <div className="p-6 overflow-y-auto space-y-4 bg-slate-900">
            <div>
              <h3 className="text-xl font-bold text-white">{viewingExercise.name}</h3>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                Descanso por defecto: <strong>{viewingExercise.defaultRestTime} segundos</strong>
              </p>
              {viewingExercise.category && (
                <p className="text-xs text-slate-400 mt-1">
                  Tipo: <strong className="text-slate-200">{viewingExercise.category}</strong>
                  {viewingExercise.hold && <span className="ml-2 text-amber-400">· se mantiene la postura</span>}
                </p>
              )}
              {viewingExercise.secondaryMuscles && viewingExercise.secondaryMuscles.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  Músculos secundarios: <strong className="text-slate-200">{viewingExercise.secondaryMuscles.join(', ')}</strong>
                </p>
              )}
              {viewingExercise.description && (
                <p className="text-sm text-slate-300 mt-3 leading-relaxed">{viewingExercise.description}</p>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Instrucciones de Ejecución</h4>
              <ol className="space-y-3">
                {viewingExercise.instructions.map((step, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-slate-300 leading-relaxed">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-950/60 text-blue-400 flex items-center justify-center font-bold text-xs mt-0.5 border border-blue-500/20">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {onUploadMedia && onDeleteMedia && onSetPrimaryMedia && (
              <ExerciseMediaSection
                exerciseName={viewingExercise.name}
                items={(media ?? []).filter((m) => m.exerciseId === viewingExercise.id)}
                onUpload={(file, onProgress) => onUploadMedia(viewingExercise.id, file, onProgress)}
                onDelete={onDeleteMedia}
                onSetPrimary={onSetPrimaryMedia}
              />
            )}
          </div>

          <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => onClose()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-md shadow-blue-500/10"
            >
              Entendido
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );
}
