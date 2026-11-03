import React, { useState, useEffect } from 'react';
import { Dumbbell } from 'lucide-react';
import { Exercise, WorkoutLog } from '../types';
import ExerciseHistoryModal from './ExerciseHistoryModal';
import type { MediaItem } from '../api/client';
import { useLibraryFilters } from '../hooks/useLibraryFilters';
import LibraryFilters from './library/LibraryFilters';
import ExerciseCard from './library/ExerciseCard';
import ExerciseDetailModal from './library/ExerciseDetailModal';
import CreateExerciseModal from './library/CreateExerciseModal';

interface ExerciseLibraryPanelProps {
  exercises: Exercise[];
  onAddCustomExercise: (exercise: Exercise) => void;
  selectable?: boolean;
  onSelectExercise?: (exercise: Exercise) => void;
  // Fotos y vídeos propios (solo en la pestaña Ejercicios)
  media?: MediaItem[];
  onUploadMedia?: (exerciseId: string, file: File, onProgress: (fraction: number) => void) => Promise<void>;
  onDeleteMedia?: (id: string) => Promise<void>;
  onSetPrimaryMedia?: (id: string) => Promise<void>;
  // Si se da el historial de entrenamientos, cada ejercicio tiene su botón «Historial»
  logs?: WorkoutLog[];
}

export default function ExerciseLibraryPanel({
  exercises,
  onAddCustomExercise,
  selectable = false,
  onSelectExercise,
  media,
  onUploadMedia,
  onDeleteMedia,
  onSetPrimaryMedia,
  logs,
}: ExerciseLibraryPanelProps) {
  const filters = useLibraryFilters(exercises);
  const { favorites, favoriteSet, filteredExercises, visibleExercises, visibleCount, loadMoreRef } = filters;
  const [historyFor, setHistoryFor] = useState<Exercise | null>(null);
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);
  const [libraryViewMode, setLibraryViewMode] = useState<'photo' | 'anatomy'>('anatomy');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Si cambia la foto principal mientras la ficha está abierta, se refresca
  useEffect(() => {
    if (!viewingExercise) return;
    const fresh = exercises.find((e) => e.id === viewingExercise.id);
    if (fresh && fresh !== viewingExercise) setViewingExercise(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises]);

  return (
    <div id="exercise-library-panel" className="space-y-6 text-slate-200">
      <LibraryFilters
        exercises={exercises}
        filters={filters}
        libraryViewMode={libraryViewMode}
        setLibraryViewMode={setLibraryViewMode}
        onCreateExercise={() => setShowCreateModal(true)}
      />

      {/* Exercise grid */}
      <div id="exercise-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleExercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            libraryViewMode={libraryViewMode}
            isFavorite={favoriteSet.has(ex.id)}
            favorites={favorites}
            selectable={selectable}
            onSelectExercise={onSelectExercise}
            hasHistory={!!logs}
            onViewDetails={setViewingExercise}
            onOpenHistory={setHistoryFor}
          />
        ))}
        {/* Sentinel: al entrar en viewport, carga el siguiente lote de tarjetas */}
        {visibleCount < filteredExercises.length && (
          <div ref={loadMoreRef} className="col-span-full py-6 text-center text-xs font-semibold text-slate-500">
            Cargando más ejercicios…
          </div>
        )}

        {filteredExercises.length === 0 && (
          <div className="col-span-full bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 p-12 text-center">
            <Dumbbell className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">No se encontraron ejercicios</p>
            <p className="text-slate-500 text-xs mt-1">Intenta cambiar los filtros o busca un nombre diferente.</p>
          </div>
        )}
      </div>

      <ExerciseDetailModal
        viewingExercise={viewingExercise}
        onClose={() => setViewingExercise(null)}
        media={media}
        onUploadMedia={onUploadMedia}
        onDeleteMedia={onDeleteMedia}
        onSetPrimaryMedia={onSetPrimaryMedia}
      />

      <CreateExerciseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={onAddCustomExercise}
      />

      {historyFor && logs && <ExerciseHistoryModal exercise={historyFor} logs={logs} onClose={() => setHistoryFor(null)} />}
    </div>
  );
}
