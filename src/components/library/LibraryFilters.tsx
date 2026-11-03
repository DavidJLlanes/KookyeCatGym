import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Dumbbell, Check, Brain, Star, Package} from 'lucide-react';
import { Exercise} from '../../types';
import { MUSCLE_GROUPS, EQUIPMENT_TYPES, EXERCISE_CATEGORIES} from '../../data/exerciseMeta';
import MuscleZoneImage from '../muscle/MuscleZoneImage';
import MuscleExplorer from '../muscle/MuscleExplorer';
import type { } from '../../api/client';
import { MUSCLE_GROUP_ZONES, MUSCLE_ZONE_LABEL } from '../../utils/muscleZone';
import { useUserData } from '../../context/UserDataContext';
import { ALWAYS_AVAILABLE, toggleOwned } from '../../utils/equipment';
import type { LibraryFilters as Filters } from '../../hooks/useLibraryFilters';

interface LibraryFiltersProps {
  exercises: Exercise[];
  filters: Filters;
  libraryViewMode: 'photo' | 'anatomy';
  setLibraryViewMode: (mode: 'photo' | 'anatomy') => void;
  onCreateExercise: () => void;
}

/** Cabecera de la biblioteca y todos sus filtros (vista, favoritos, equipamiento, músculo, zona, mapa). */
export default function LibraryFilters({ exercises, filters, libraryViewMode, setLibraryViewMode, onCreateExercise }: LibraryFiltersProps) {
  const { setValue } = useUserData();
  const {
    favorites, myEquipment, onlyFavorites, setOnlyFavorites, showMyEquipment, setShowMyEquipment,
    search, setSearch, selectedMuscle, selectedEquipment, setSelectedEquipment,
    selectedCategory, setSelectedCategory, selectedZone, setSelectedZone,
    selectedPart, setSelectedPart, showMap, setShowMap, handleSelectMuscle,
  } = filters;
  return (
    <>
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-start gap-2 leading-tight">
          <Dumbbell className="h-6 w-6 shrink-0 text-blue-400 mt-0.5" />
          <span className="min-w-0">Biblioteca de Ejercicios</span>
        </h2>
        <p className="text-sm text-slate-400">
          Explora {exercises.length} movimientos de alta calidad o añade tus propios ejercicios personalizados.
        </p>
      </div>
      <button id="btn-create-exercise" onClick={() => onCreateExercise()} className="btn btn-primary w-full sm:w-auto sm:self-start md:self-auto">
        <Plus />
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

      {/* Lo tuyo: favoritos y el material que tienes */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOnlyFavorites(!onlyFavorites)}
          aria-pressed={onlyFavorites}
          className={`flex min-h-[2.5rem] items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
            onlyFavorites ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold' : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Star className="h-3.5 w-3.5" fill={onlyFavorites ? 'currentColor' : 'none'} />
          Favoritos{favorites.length > 0 ? ` (${favorites.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setValue('my-equipment', { ...myEquipment, enabled: !myEquipment.enabled })}
          aria-pressed={myEquipment.enabled}
          className={`flex min-h-[2.5rem] items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
            myEquipment.enabled ? 'bg-emerald-600 border-emerald-500 text-white font-bold' : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Package className="h-3.5 w-3.5 shrink-0" />
          Mi equipamiento
        </button>
        <button type="button" onClick={() => setShowMyEquipment(!showMyEquipment)} aria-expanded={showMyEquipment} className="col-span-2 text-left text-xs font-bold text-blue-400 hover:text-blue-300 cursor-pointer py-1">
          {showMyEquipment ? 'Cerrar la lista de mi equipamiento' : 'Elegir qué material tengo →'}
        </button>
      </div>
      {showMyEquipment && (
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <p className="text-xs text-slate-400">Marca lo que tienes. Con «Solo mi equipamiento» activo, el catálogo y los filtros solo enseñan lo que puedes hacer. El peso corporal siempre está disponible.</p>
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT_TYPES.filter((eq) => eq !== ALWAYS_AVAILABLE).map((eq) => {
              const owned = myEquipment.owned.includes(eq);
              return (
                <button
                  key={eq}
                  type="button"
                  onClick={() => setValue('my-equipment', toggleOwned(myEquipment, eq))}
                  aria-pressed={owned}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border ${
                    owned ? 'bg-emerald-600/20 border-emerald-500/60 text-emerald-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {owned && <Check className="inline h-3 w-3 mr-1" />}
                  {eq}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          aria-expanded={showMap}
          className="px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer border bg-slate-950 border-slate-850 text-slate-300 hover:bg-slate-800"
        >
          {showMap ? 'Ocultar mapa muscular' : selectedPart ? 'Mapa muscular (filtro activo)' : 'Buscar en el mapa muscular'}
        </button>
        {showMap && (
          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <MuscleExplorer selected={selectedPart ? [selectedPart] : []} onToggle={(p) => setSelectedPart(p === selectedPart ? null : p)} hint="Toca un músculo para filtrar" />
          </div>
        )}
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
                  <MuscleZoneImage
                    zone={zone}
                    className="h-7 w-7 rounded-full object-contain bg-white border border-slate-700 shrink-0 overflow-hidden"
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

      <div className="flex flex-wrap gap-2">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-full mb-1">
          Tipo de ejercicio
        </div>
        {['Todos', ...EXERCISE_CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedCategory === cat
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
    </>
  );
}
