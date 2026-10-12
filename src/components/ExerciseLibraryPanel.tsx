import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Info, Plus, Dumbbell, Clock, ChevronRight, X, Sparkles, Check, Brain } from 'lucide-react';
import { Exercise } from '../types';
import { MUSCLE_GROUPS, EQUIPMENT_TYPES, getMuscleColor } from '../data/exerciseMeta';
import ExerciseAIVisualizer from './ExerciseAIVisualizer';
import ExerciseCardThumbnail from './ExerciseCardThumbnail';
import { useLightbox } from '../context/LightboxContext';
import ExerciseMediaSection from './ExerciseMediaSection';
import type { MediaItem } from '../api/client';
import { detectMuscleZone, MuscleZone, MUSCLE_GROUP_ZONES, MUSCLE_ZONE_IMAGE, MUSCLE_ZONE_LABEL } from '../utils/muscleZone';

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
}: ExerciseLibraryPanelProps) {
  const { openLightbox } = useLightbox();
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('Todos');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('Todos');
  // Filtro de segundo nivel: sub-músculo concreto dentro del grupo elegido.
  const [selectedZone, setSelectedZone] = useState<MuscleZone | 'Todas'>('Todas');

  // Al cambiar de grupo muscular se reinicia el sub-filtro (las zonas de un
  // grupo no tienen sentido en otro).
  const handleSelectMuscle = (mg: string) => {
    setSelectedMuscle(mg);
    setSelectedZone('Todas');
  };

  // Zona (imagen muscular) de cada ejercicio, precalculada una sola vez para
  // no recorrer las reglas de detección en cada render/filtrado.
  const zoneByExerciseId = useMemo(() => {
    const map = new Map<string, MuscleZone>();
    exercises.forEach((ex) => map.set(ex.id, detectMuscleZone(ex)));
    return map;
  }, [exercises]);
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);
  // Si cambia la foto principal mientras la ficha está abierta, se refresca
  useEffect(() => {
    if (!viewingExercise) return;
    const fresh = exercises.find((e) => e.id === viewingExercise.id);
    if (fresh && fresh !== viewingExercise) setViewingExercise(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises]);
  const [viewingMode, setViewingMode] = useState<'photo' | 'ai'>('ai');
  const [libraryViewMode, setLibraryViewMode] = useState<'photo' | 'anatomy'>('anatomy');
  
  // Custom exercise creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState<Exercise['muscleGroup']>('Pecho');
  const [newEquipment, setNewEquipment] = useState<Exercise['equipment']>('Mancuernas');
  const [newRest, setNewRest] = useState(90);
  const [newInstructions, setNewInstructions] = useState('');

  // Filtering
  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = selectedMuscle === 'Todos' || ex.muscleGroup === selectedMuscle;
    const matchesEquipment = selectedEquipment === 'Todos' || ex.equipment === selectedEquipment;
    const matchesZone = selectedZone === 'Todas' || zoneByExerciseId.get(ex.id) === selectedZone;
    return matchesSearch && matchesMuscle && matchesEquipment && matchesZone;
  });

  // Renderizado incremental: con 873 ejercicios, montar todas las tarjetas de
  // golpe (imágenes incluidas) hacía la pestaña lenta al abrir y al hacer
  // scroll. Solo se renderiza un lote inicial, y se van añadiendo más lotes
  // a medida que el usuario se acerca al final de la lista.
  const PAGE_SIZE = 30;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, selectedMuscle, selectedEquipment, selectedZone]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredExercises.length));
        }
      },
      { rootMargin: '600px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredExercises.length]);

  const visibleExercises = filteredExercises.slice(0, visibleCount);

  const handleCreateCustomExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    // Use a clean Unsplash placeholder based on the muscle group
    let placeholderUrl = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80';
    if (newMuscle === 'Pecho') {
      placeholderUrl = 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&auto=format&fit=crop&q=80';
    } else if (newMuscle === 'Piernas') {
      placeholderUrl = 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=80';
    } else if (newMuscle === 'Espalda') {
      placeholderUrl = 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&auto=format&fit=crop&q=80';
    }

    const customEx: Exercise = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: newName,
      muscleGroup: newMuscle,
      equipment: newEquipment,
      imageUrl: placeholderUrl,
      defaultRestTime: newRest,
      instructions: newInstructions
        ? newInstructions.split('\n').filter(line => line.trim().length > 0)
        : ['Comienza en una posición estable y ejecuta el movimiento controlando la fase excéntrica.'],
      isCustom: true,
    };

    onAddCustomExercise(customEx);
    
    // Reset form
    setNewName('');
    setNewMuscle('Pecho');
    setNewEquipment('Mancuernas');
    setNewRest(90);
    setNewInstructions('');
    setShowCreateModal(false);
  };  return (
    <div id="exercise-library-panel" className="space-y-6 text-slate-200">
      {/* Header section with Search and Create button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-blue-400" />
            Biblioteca de Ejercicios
          </h2>
          <p className="text-sm text-slate-400">
            Explora {exercises.length} movimientos de alta calidad o añade tus propios ejercicios personalizados.
          </p>
        </div>
        <button
          id="btn-create-exercise"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/10 self-start md:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Añadir Ejercicio
        </button>
      </div>

      {/* Search & Filters block */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              id="input-exercise-search"
              type="text"
              placeholder="Buscar por nombre de ejercicio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            />
          </div>

          {/* Visual Mode Selector */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850/60 text-[11px] font-bold sm:w-64 shrink-0 shadow-inner">
            <button
              type="button"
              onClick={() => setLibraryViewMode('anatomy')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                libraryViewMode === 'anatomy'
                  ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Brain className="h-3.5 w-3.5 text-blue-200" />
              Anatomía
            </button>
            <button
              type="button"
              onClick={() => setLibraryViewMode('photo')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                libraryViewMode === 'photo'
                  ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Dumbbell className="h-3.5 w-3.5 text-blue-200" />
              Fotos Reales
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-full mb-1">
            Grupo Muscular
          </div>
          <button
            onClick={() => handleSelectMuscle('Todos')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedMuscle === 'Todos'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
            }`}
          >
            Todos
          </button>
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg}
              onClick={() => handleSelectMuscle(mg)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                selectedMuscle === mg
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {mg}
            </button>
          ))}
        </div>

        {/* Segundo nivel: sub-músculo concreto. Solo aparece tras elegir un
            grupo (no en "Todos"), con las zonas de ese grupo y una miniatura
            de la imagen muscular en cada chip. */}
        <AnimatePresence initial={false}>
          {selectedMuscle !== 'Todos' && MUSCLE_GROUP_ZONES[selectedMuscle as Exercise['muscleGroup']] && (
            <motion.div
              key={selectedMuscle}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-full mb-1">
                  Zona específica
                </div>
                <button
                  onClick={() => setSelectedZone('Todas')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                    selectedZone === 'Todas'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  Todas
                </button>
                {MUSCLE_GROUP_ZONES[selectedMuscle as Exercise['muscleGroup']].map((zone) => (
                  <button
                    key={zone}
                    onClick={() => setSelectedZone(zone)}
                    className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                      selectedZone === zone
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <img
                      src={MUSCLE_ZONE_IMAGE[zone]}
                      alt=""
                      loading="lazy"
                      className="h-7 w-7 rounded-full object-contain bg-white border border-slate-700 shrink-0"
                    />
                    {MUSCLE_ZONE_LABEL[zone]}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap gap-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-full mb-1">
            Equipamiento
          </div>
          <button
            onClick={() => setSelectedEquipment('Todos')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedEquipment === 'Todos'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
            }`}
          >
            Todos
          </button>
          {EQUIPMENT_TYPES.map((eq) => (
            <button
              key={eq}
              onClick={() => setSelectedEquipment(eq)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                selectedEquipment === eq
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {eq}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise grid */}
      <div id="exercise-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleExercises.map((ex) => (
          <div
            key={ex.id}
            id={`exercise-card-${ex.id}`}
            className="group bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden hover:shadow-xl hover:border-slate-700 transition-all duration-300 flex flex-row"
          >
            {/* Visual: imagen a la izquierda, completa (sin recortar) */}
            <div className="w-1/4 sm:w-40 lg:w-44 shrink-0 relative bg-slate-950 overflow-hidden border-r border-slate-900">
              <ExerciseCardThumbnail exercise={ex} mode={libraryViewMode} />
            </div>

            {/* Info Body */}
            <div className="p-4 flex flex-col justify-between flex-grow min-w-0 bg-slate-900">
              <div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider"
                    style={{ backgroundColor: getMuscleColor(ex.muscleGroup) }}
                  >
                    {ex.muscleGroup}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-200 uppercase tracking-wider bg-slate-950/90 backdrop-blur-sm border border-slate-800/85">
                    {ex.equipment}
                  </span>
                  {ex.isCustom && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider bg-blue-600/90 backdrop-blur-sm flex items-center gap-0.5 shadow-md">
                      <Sparkles className="h-2.5 w-2.5" /> Personalizado
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-slate-100 line-clamp-2 group-hover:text-blue-400 transition-colors text-sm sm:text-base">
                  {ex.name}
                </h3>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                  <span>Descanso sugerido: {ex.defaultRestTime}s</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-slate-800">
                <button
                  onClick={() => setViewingExercise(ex)}
                  className="flex-1 min-w-[112px] flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-800 whitespace-nowrap"
                >
                  <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  Instrucciones
                </button>
                {selectable && onSelectExercise && (
                  <button
                    onClick={() => onSelectExercise(ex)}
                    className="flex-1 min-w-[112px] px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-blue-500/10 whitespace-nowrap"
                  >
                    Seleccionar
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  </button>
                )}
              </div>
            </div>
          </div>
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

      {/* MODAL: View Exercise Instructions */}
      <AnimatePresence>
        {viewingExercise && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-800 max-h-[85dvh] flex flex-col"
            >
              {/* Selector de modo: IA vs Foto Real */}
              <div className="flex bg-slate-950 border-b border-slate-850 p-3.5 text-xs font-semibold gap-2.5 relative">
                <div className="flex gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800/50 flex-grow">
                  <button
                    type="button"
                    onClick={() => setViewingMode('ai')}
                    className={`flex-grow py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      viewingMode === 'ai'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Brain className="h-3.5 w-3.5 text-blue-200" />
                    Ilustración IA
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingMode('photo')}
                    className={`flex-grow py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      viewingMode === 'photo'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Info className="h-3.5 w-3.5 text-blue-200" />
                    Foto Real
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingExercise(null)}
                  className="bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 p-2.5 rounded-xl transition-all cursor-pointer border border-slate-800/85 flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Contenido Visual Condicional */}
              <div className="relative">
                {viewingMode === 'photo' ? (
                  <div className="relative h-[320px] w-full bg-slate-950">
                    <img
                      src={viewingExercise.imageUrl}
                      alt={viewingExercise.name}
                      referrerPolicy="no-referrer"
                      onClick={() => openLightbox(viewingExercise.imageUrl, viewingExercise.name)}
                      className="w-full h-full object-contain cursor-zoom-in"
                    />
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
                  <div className="relative h-[270px] w-full bg-slate-950 border-b border-slate-800/40">
                    <ExerciseAIVisualizer exercise={viewingExercise} />
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
                  onClick={() => setViewingExercise(null)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-md shadow-blue-500/10"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Create Custom Exercise */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-800 max-h-[90dvh] flex flex-col"
            >
              <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                  Nuevo Ejercicio Personalizado
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomExercise} className="overflow-y-auto flex-grow p-6 space-y-4 bg-slate-900">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Nombre del Ejercicio</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. Flexiones Diamante, Curl de Bíceps Inclinado..."
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Grupo Muscular</label>
                    <select
                      value={newMuscle}
                      onChange={(e) => setNewMuscle(e.target.value as Exercise['muscleGroup'])}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm cursor-pointer"
                    >
                      {MUSCLE_GROUPS.map((mg) => (
                        <option key={mg} value={mg} className="bg-slate-950 text-slate-100">{mg}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Equipamiento</label>
                    <select
                      value={newEquipment}
                      onChange={(e) => setNewEquipment(e.target.value as Exercise['equipment'])}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm cursor-pointer"
                    >
                      {EQUIPMENT_TYPES.map((eq) => (
                        <option key={eq} value={eq} className="bg-slate-950 text-slate-100">{eq}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Tiempo de Descanso por Defecto (segundos)
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="number"
                      required
                      min={10}
                      max={600}
                      value={newRest}
                      onChange={(e) => setNewRest(parseInt(e.target.value) || 90)}
                      className="w-32 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                    />
                    <span className="text-xs text-slate-500">
                      Equivale a {Math.floor(newRest / 60)}m y {newRest % 60}s. Se iniciará al completar una serie.
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Instrucciones (Una por línea)
                  </label>
                  <textarea
                    rows={4}
                    value={newInstructions}
                    onChange={(e) => setNewInstructions(e.target.value)}
                    placeholder="Paso 1: Colócate en posición...&#10;Paso 2: Baja el peso de forma controlada...&#10;Paso 3: Realiza un empuje explosivo..."
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm placeholder-slate-600 leading-relaxed"
                  />
                </div>
              </form>

              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-slate-400 hover:bg-slate-800 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCustomExercise}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  Crear Ejercicio
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
