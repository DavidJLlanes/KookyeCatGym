import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, Share2, Plus, Play, Trash2, Edit, Dumbbell, Clock, X, ChevronRight, Check, ChevronUp, ChevronDown, Folder, FolderOpen, FolderPlus, Link2, Link2Off } from 'lucide-react';
import { Routine, Exercise, WorkoutExercise, WorkoutSet } from '../types';
import ExerciseLibraryPanel from './ExerciseLibraryPanel';
import DecimalInput from './DecimalInput';
import ConfirmDialog from './ConfirmDialog';
import { useLightbox } from '../context/LightboxContext';
import { getStaticThumbUrl } from '../utils/media';
import { repsColumnLabel, defaultReps, isCardio, isHold, looksUnilateral } from '../utils/holdSets';
import DurationInput from './DurationInput';
import { SET_KINDS, SetKind, kindOf, withKind, setLabel, supersetLetters, toggleSupersetWithNext, normalizeSupersets, groupName } from '../utils/setTypes';
import AnchoredPopover from './AnchoredPopover';
import SetKindMenu from './SetKindMenu';
import StarterPlansModal from './StarterPlansModal';
import SharePlanModal from './SharePlanModal';
import RotationSettings from './RotationSettings';
import RestTimePicker from './RestTimePicker';
import ExerciseQuickPick from './ExerciseQuickPick';
import WeightStackEditor from './WeightStackEditor';
import { cleanAlternatives, MAX_ALTERNATIVES } from '../utils/exerciseSwap';
import { formatRest } from '../utils/restTimes';
import { buildPyramid, PyramidDirection } from '../utils/pyramid';
import MiniBodyMap from './muscle/MiniBodyMap';
import { routineMuscles, sessionMuscles } from '../utils/sessionMuscles';

interface RoutinesPanelProps {
  routines: Routine[];
  exercises: Exercise[];
  onStartRoutine: (routine: Routine) => void;
  onSaveRoutine: (routine: Routine) => void;
  onDeleteRoutine: (routineId: string) => void;
  // Borrado en bloque SIN confirmación propia (la confirmación la hace este
  // panel al eliminar una carpeta entera con sus rutinas dentro).
  onDeleteRoutines: (routineIds: string[]) => void;
  onReorderRoutines: (updated: Routine[]) => void;
  // Añade varias rutinas de una vez (planes de iniciación)
  onAddRoutines: (routines: Routine[]) => void;
}

// Las carpetas se derivan de la propiedad `folder` de cada rutina, así que una
// carpeta recién creada (todavía sin rutinas) no existiría en ningún sitio.
// Se guarda aparte la lista de carpetas creadas por el usuario para que las
// vacías persistan hasta que se les añada una rutina o se borren.
const CUSTOM_FOLDERS_KEY = 'hevy_custom_folders';

function loadCustomFolders(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_FOLDERS_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((f): f is string => typeof f === 'string') : [];
  } catch {
    return [];
  }
}

function hasValidPhoto(ex?: Exercise) {
  return (
    !!ex?.imageUrl &&
    !ex.imageUrl.includes('placeholder') &&
    (ex.imageUrl.startsWith('http') || ex.imageUrl.startsWith('/'))
  );
}

// Miniatura de ejercicio: muestra la foto COMPLETA (nunca recortada) sin
// importar el tamaño/formato original de la imagen fuente. Ocupa 1/4 del
// ancho del contenedor en móvil (y un ancho fijo mayor en pantallas grandes).
function ExerciseThumb({ ex }: { ex?: Exercise }) {
  const { openLightbox } = useLightbox();
  return (
    <div className="w-1/4 sm:w-28 lg:w-32 shrink-0 aspect-square rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
      {hasValidPhoto(ex) ? (
        <img
          src={getStaticThumbUrl(ex!.imageUrl)}
          alt={ex!.name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onClick={(e) => {
            e.stopPropagation();
            openLightbox(ex!.imageUrl, ex!.name, ex!.videoUrl);
          }}
          className="w-full h-full object-contain cursor-zoom-in"
        />
      ) : (
        <Dumbbell className="h-6 w-6 text-blue-400" />
      )}
    </div>
  );
}

interface RoutineCardProps {
  routine: Routine;
  exercises: Exercise[];
  onStart: (routine: Routine) => void;
  onEdit: (routine: Routine) => void;
  onDelete: (routineId: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

function RoutineCard({ routine, exercises, onStart, onEdit, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: RoutineCardProps) {
  const showReorder = !!(onMoveUp || onMoveDown);
  return (
    <div
      id={`routine-card-${routine.id}`}
      className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg hover:shadow-xl hover:border-slate-700 transition-all duration-300 flex flex-col justify-between"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2 min-w-0">
            {showReorder && (
              <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                <button
                  type="button"
                  onClick={onMoveUp}
                  disabled={!canMoveUp}
                  title="Mover arriba"
                  className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-slate-700 disabled:opacity-25 disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onMoveDown}
                  disabled={!canMoveDown}
                  title="Mover abajo"
                  className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-slate-700 disabled:opacity-25 disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="min-w-0">
              <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold text-blue-400 bg-blue-950/40 border border-blue-500/20 mb-2">
                {routine.dayOfWeek || 'Cualquier día'}
              </span>
              <h3 className="text-lg font-black text-white leading-snug">{routine.name}</h3>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onEdit(routine)}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-750"
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(routine.id)}
              className="p-1.5 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer border border-transparent"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{routine.description}</p>

        <MiniBodyMap sets={routineMuscles(routine, exercises)} height={64} className="mx-auto flex justify-center w-full" />

        {/* Exercises Preview */}
        <div className="space-y-1.5 pt-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ejercicios ({routine.exercises.length})</div>
          <div className="space-y-2">
            {routine.exercises.map((we) => {
              const ex = exercises.find((e) => e.id === we.exerciseId);
              return (
                <div
                  key={we.id}
                  className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden flex items-center gap-3"
                >
                  <ExerciseThumb ex={ex} />
                  <span className="text-xs font-semibold text-slate-300 flex-1 min-w-0 truncate pr-2">
                    {ex ? ex.name : 'Ejercicio'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold pr-3 shrink-0">x{we.sets.length}</span>
                </div>
              );
            })}
            {routine.exercises.length === 0 && (
              <span className="text-xs text-slate-500 italic">Sin ejercicios todavía</span>
            )}
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="pt-5 mt-5 border-t border-slate-800">
        <button
          id={`btn-start-routine-${routine.id}`}
          onClick={() => onStart(routine)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
        >
          <Play className="h-4 w-4 fill-white text-white" />
          Iniciar Entrenamiento
        </button>
      </div>
    </div>
  );
}

const NO_FOLDER = '__sin_carpeta__';

// Paleta de acentos que se reparte entre carpetas (por índice) para darle a
// cada una identidad visual propia. Las clases están escritas en literal
// completo para que Tailwind las detecte al escanear el código fuente.
const FOLDER_ACCENTS = [
  { icon: 'text-blue-400', badgeBg: 'bg-blue-500/15', badgeBorder: 'border-blue-500/30', hoverBorder: 'hover:border-blue-500/40', hoverText: 'group-hover:text-blue-300' },
  { icon: 'text-emerald-400', badgeBg: 'bg-emerald-500/15', badgeBorder: 'border-emerald-500/30', hoverBorder: 'hover:border-emerald-500/40', hoverText: 'group-hover:text-emerald-300' },
  { icon: 'text-amber-400', badgeBg: 'bg-amber-500/15', badgeBorder: 'border-amber-500/30', hoverBorder: 'hover:border-amber-500/40', hoverText: 'group-hover:text-amber-300' },
  { icon: 'text-fuchsia-400', badgeBg: 'bg-fuchsia-500/15', badgeBorder: 'border-fuchsia-500/30', hoverBorder: 'hover:border-fuchsia-500/40', hoverText: 'group-hover:text-fuchsia-300' },
  { icon: 'text-cyan-400', badgeBg: 'bg-cyan-500/15', badgeBorder: 'border-cyan-500/30', hoverBorder: 'hover:border-cyan-500/40', hoverText: 'group-hover:text-cyan-300' },
  { icon: 'text-orange-400', badgeBg: 'bg-orange-500/15', badgeBorder: 'border-orange-500/30', hoverBorder: 'hover:border-orange-500/40', hoverText: 'group-hover:text-orange-300' },
];
const NEUTRAL_ACCENT = { icon: 'text-slate-400', badgeBg: 'bg-slate-800/60', badgeBorder: 'border-slate-700', hoverBorder: 'hover:border-slate-700', hoverText: 'group-hover:text-slate-200' };

interface FolderSectionProps {
  label: string;
  routines: Routine[];
  exercises: Exercise[];
  isCollapsed: boolean;
  onToggle: () => void;
  onStart: (routine: Routine) => void;
  onEdit: (routine: Routine) => void;
  onDelete: (routineId: string) => void;
  onMoveRoutineUp: (routineId: string) => void;
  onMoveRoutineDown: (routineId: string) => void;
  accentIndex?: number;
  onMoveFolderUp?: () => void;
  onMoveFolderDown?: () => void;
  canMoveFolderUp?: boolean;
  canMoveFolderDown?: boolean;
  onDeleteFolder?: () => void;
}

function FolderSection({
  label,
  routines,
  exercises,
  isCollapsed,
  onToggle,
  onStart,
  onEdit,
  onDelete,
  onMoveRoutineUp,
  onMoveRoutineDown,
  accentIndex,
  onMoveFolderUp,
  onMoveFolderDown,
  canMoveFolderUp,
  canMoveFolderDown,
  onDeleteFolder,
}: FolderSectionProps) {
  // Nota: una carpeta vacía SÍ se muestra (para poder crearla antes de meterle
  // rutinas y para poder borrarla). El grupo "sin carpeta" ya se oculta desde
  // fuera cuando no tiene rutinas.
  const accent = accentIndex === undefined ? NEUTRAL_ACCENT : FOLDER_ACCENTS[accentIndex % FOLDER_ACCENTS.length];
  const folderReorderable = !!(onMoveFolderUp || onMoveFolderDown);

  return (
    <div className="space-y-4">
      <div
        className={`w-full flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 ${accent.hoverBorder} rounded-2xl px-2 py-2 sm:px-2.5 sm:py-2.5 shadow-sm transition-all`}
      >
        {folderReorderable && (
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              type="button"
              onClick={onMoveFolderUp}
              disabled={!canMoveFolderUp}
              title="Mover carpeta arriba"
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-slate-700 disabled:opacity-25 disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveFolderDown}
              disabled={!canMoveFolderDown}
              title="Mover carpeta abajo"
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-slate-700 disabled:opacity-25 disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 min-w-[9.5rem] flex items-center gap-3 text-left cursor-pointer group px-1.5 py-1 sm:px-2"
        >
          <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl ${accent.badgeBg} border ${accent.badgeBorder} flex items-center justify-center shrink-0 transition-colors`}>
            {isCollapsed ? (
              <Folder className={`h-5 w-5 ${accent.icon}`} />
            ) : (
              <FolderOpen className={`h-5 w-5 ${accent.icon}`} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`font-extrabold text-white text-sm sm:text-base leading-tight line-clamp-2 break-words transition-colors ${accent.hoverText}`}>
              {label}
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">
              {routines.length} {routines.length === 1 ? 'rutina' : 'rutinas'}
            </span>
          </div>
          <ChevronDown
            className={`h-4.5 w-4.5 text-slate-500 transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : ''}`}
          />
        </button>
        {onDeleteFolder && (
          <button
            type="button"
            onClick={onDeleteFolder}
            title="Eliminar carpeta"
            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all cursor-pointer shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routines.map((routine, idx) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              exercises={exercises}
              onStart={onStart}
              onEdit={onEdit}
              onDelete={onDelete}
              onMoveUp={() => onMoveRoutineUp(routine.id)}
              onMoveDown={() => onMoveRoutineDown(routine.id)}
              canMoveUp={idx > 0}
              canMoveDown={idx < routines.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoutinesPanel({
  routines,
  exercises,
  onStartRoutine,
  onSaveRoutine,
  onDeleteRoutine,
  onDeleteRoutines,
  onReorderRoutines,
  onAddRoutines,
}: RoutinesPanelProps) {
  const [showStarterPlans, setShowStarterPlans] = useState(false);
  const [showSharePlan, setShowSharePlan] = useState(false);
  // Rueda de descanso abierta: de un ejercicio entero o de una serie concreta
  const [restPicker, setRestPicker] = useState<{ instanceId: string; setId?: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

  // Creation form states
  const [routineName, setRoutineName] = useState('');
  const [routineDesc, setRoutineDesc] = useState('');
  const [routineDay, setRoutineDay] = useState('Lunes');
  const [routineFolder, setRoutineFolder] = useState('');
  const [addingNewFolder, setAddingNewFolder] = useState(false);
  const [selectedWorkoutExercises, setSelectedWorkoutExercises] = useState<WorkoutExercise[]>([]);
  // Menú de tipo de serie abierto: serie y botón junto al que se muestra
  const [kindPicker, setKindPicker] = useState<{ setId: string; anchor: HTMLElement } | null>(null);
  const [showAddExerciseSelector, setShowAddExerciseSelector] = useState(false);

  // Modal de creación rápida de carpeta desde la cabecera del listado
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Carpetas creadas por el usuario que aún no tienen ninguna rutina dentro.
  // Se persisten aparte porque el modelo deriva las carpetas de las rutinas.
  const [customFolders, setCustomFolders] = useState<string[]>(loadCustomFolders);
  const persistCustomFolders = (list: string[]) => {
    setCustomFolders(list);
    localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(list));
  };

  // Carpeta pendiente de confirmación de borrado
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  // Carpetas existentes, derivadas de las rutinas ya creadas. Si el usuario
  // ya reordenó alguna carpeta se respeta ese orden (folderOrder); las que
  // aún no tienen orden explícito se colocan después, por orden alfabético.
  const existingFolders = (() => {
    // Carpetas con rutinas dentro (derivadas) + carpetas vacías creadas por el
    // usuario (persistidas aparte), sin duplicados.
    const names = [
      ...new Set([
        ...routines.map((r) => r.folder).filter((f): f is string => !!f),
        ...customFolders,
      ]),
    ];
    const meta = names.map((folder) => {
      const orders = routines
        .filter((r) => r.folder === folder)
        .map((r) => r.folderOrder)
        .filter((v): v is number => v !== undefined && v !== null);
      return { folder, order: orders.length > 0 ? Math.min(...orders) : null };
    });
    meta.sort((a, b) => {
      if (a.order !== null && b.order !== null) return a.order - b.order;
      if (a.order !== null) return -1;
      if (b.order !== null) return 1;
      return a.folder.localeCompare(b.folder, 'es');
    });
    return meta.map((m) => m.folder);
  })();

  // Rutinas de un grupo (carpeta concreta, o sin carpeta si groupFolder es
  // null) ordenadas por sortOrder; sin valor explícito se conserva el orden
  // en que llegan del servidor (más recientes primero).
  const getGroupRoutines = (groupFolder: string | null) => {
    const group = routines.filter((r) => (groupFolder === null ? !r.folder : r.folder === groupFolder));
    return [...group].sort((a, b) => {
      const ao = a.sortOrder ?? null;
      const bo = b.sortOrder ?? null;
      if (ao !== null && bo !== null) return ao - bo;
      if (ao !== null) return -1;
      if (bo !== null) return 1;
      return 0;
    });
  };

  const moveFolder = (folder: string, direction: 'up' | 'down') => {
    const order = [...existingFolders];
    const idx = order.indexOf(folder);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || targetIdx < 0 || targetIdx >= order.length) return;
    [order[idx], order[targetIdx]] = [order[targetIdx], order[idx]];

    const updated: Routine[] = [];
    order.forEach((f, i) => {
      routines.filter((r) => r.folder === f).forEach((r) => updated.push({ ...r, folderOrder: i }));
    });
    onReorderRoutines(updated);
  };

  const moveRoutineInGroup = (groupFolder: string | null, routineId: string, direction: 'up' | 'down') => {
    const group = getGroupRoutines(groupFolder);
    const idx = group.findIndex((r) => r.id === routineId);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || targetIdx < 0 || targetIdx >= group.length) return;
    const reordered = [...group];
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
    onReorderRoutines(reordered.map((r, i) => ({ ...r, sortOrder: i })));
  };

  // Carpetas expandidas en la vista de listado (por defecto todas cerradas)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  const startNewRoutineCreation = () => {
    setRoutineName('');
    setRoutineDesc('');
    setRoutineDay('Lunes');
    setRoutineFolder('');
    setAddingNewFolder(false);
    setSelectedWorkoutExercises([]);
    setEditingRoutine(null);
    setIsEditing(true);
  };

  // Crear carpeta = crear la carpeta y punto. Antes esto abría el formulario
  // de nueva rutina con la carpeta preseleccionada, así que si no llegabas a
  // guardar una rutina la carpeta no se creaba nunca.
  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    const alreadyExists = existingFolders.some((f) => f.toLowerCase() === name.toLowerCase());
    if (!alreadyExists) {
      persistCustomFolders([...customFolders, name]);
    }
    setExpandedFolders((prev) => new Set(prev).add(name));
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  // Borrar carpeta: elimina la carpeta y TODAS las rutinas que contenga.
  const confirmDeleteFolder = () => {
    if (!folderToDelete) return;
    const idsToDelete = routines.filter((r) => r.folder === folderToDelete).map((r) => r.id);
    if (idsToDelete.length > 0) onDeleteRoutines(idsToDelete);
    persistCustomFolders(customFolders.filter((f) => f !== folderToDelete));
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.delete(folderToDelete);
      return next;
    });
    setFolderToDelete(null);
  };

  const startEditingExisting = (routine: Routine) => {
    setRoutineName(routine.name);
    setRoutineDesc(routine.description);
    setRoutineDay(routine.dayOfWeek || 'Lunes');
    setRoutineFolder(routine.folder || '');
    setAddingNewFolder(false);
    // Deep copy exercises so we don't mutate state directly
    setSelectedWorkoutExercises(JSON.parse(JSON.stringify(routine.exercises)));
    setEditingRoutine(routine);
    setIsEditing(true);
  };

  const handleSelectExercise = (exercise: Exercise) => {
    // Add exercise with standard 3 sets
    const defaultSets: WorkoutSet[] = [
      { id: `set-${Date.now()}-1`, weight: 0, reps: defaultReps(exercise), completed: false },
      { id: `set-${Date.now()}-2`, weight: 0, reps: defaultReps(exercise), completed: false },
      { id: `set-${Date.now()}-3`, weight: 0, reps: defaultReps(exercise), completed: false },
    ];

    const newWorkoutExercise: WorkoutExercise = {
      id: `we-${Date.now()}`,
      exerciseId: exercise.id,
      sets: defaultSets,
      restTime: exercise.defaultRestTime,
      ...(looksUnilateral(exercise.name) && !isHold(exercise) ? { perSide: true } : {}),
    };

    setSelectedWorkoutExercises([...selectedWorkoutExercises, newWorkoutExercise]);
    setShowAddExerciseSelector(false);
  };

  const handleRemoveExercise = (instanceId: string) => {
    setSelectedWorkoutExercises(normalizeSupersets(selectedWorkoutExercises.filter((we) => we.id !== instanceId)));
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedWorkoutExercises.length) return;

    const updated = [...selectedWorkoutExercises];
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    setSelectedWorkoutExercises(normalizeSupersets(updated));
  };

  const handleToggleSuperset = (index: number) => {
    setSelectedWorkoutExercises(toggleSupersetWithNext(selectedWorkoutExercises, index));
  };

  const handleSetKind = (instanceId: string, setId: string, kind: SetKind) => {
    setKindPicker(null);
    setSelectedWorkoutExercises(
      selectedWorkoutExercises.map((we) =>
        we.id !== instanceId ? we : { ...we, sets: we.sets.map((s) => (s.id === setId ? withKind(s, kind) : s)) }
      )
    );
  };

  const handleAddSet = (instanceId: string) => {
    setSelectedWorkoutExercises(
      selectedWorkoutExercises.map((we) => {
        if (we.id !== instanceId) return we;
        const lastSet = we.sets[we.sets.length - 1];
        const newSet: WorkoutSet = {
          id: `set-${Date.now()}-${we.sets.length + 1}`,
          weight: lastSet ? lastSet.weight : 0,
          reps: lastSet ? lastSet.reps : 10,
          completed: false,
        };
        return { ...we, sets: [...we.sets, newSet] };
      })
    );
  };

  const handleRemoveSet = (instanceId: string, setId: string) => {
    setSelectedWorkoutExercises(
      selectedWorkoutExercises.map((we) => {
        if (we.id !== instanceId) return we;
        if (we.sets.length <= 1) return we; // keep at least one set
        return { ...we, sets: we.sets.filter((s) => s.id !== setId) };
      })
    );
  };

  const handleTogglePerSide = (instanceId: string) => {
    setSelectedWorkoutExercises(
      selectedWorkoutExercises.map((we) => {
        if (we.id !== instanceId) return we;
        const { perSide: _p, ...rest } = we;
        return we.perSide ? rest : { ...rest, perSide: true };
      })
    );
  };

  const handleUpdateSetValues = (instanceId: string, setId: string, field: 'weight' | 'reps' | 'distance', val: number) => {
    setSelectedWorkoutExercises(
      selectedWorkoutExercises.map((we) => {
        if (we.id !== instanceId) return we;
        return {
          ...we,
          sets: we.sets.map((s) => {
            if (s.id !== setId) return s;
            return { ...s, [field]: val };
          }),
        };
      })
    );
  };

  const handleUpdateRestTime = (instanceId: string, seconds: number) => {
    setSelectedWorkoutExercises(
      selectedWorkoutExercises.map((we) => {
        if (we.id !== instanceId) return we;
        return { ...we, restTime: Math.max(0, seconds) };
      })
    );
  };

  // Ejercicios de repuesto (máquina ocupada): se editan por ejercicio de la rutina
  const handleSetAlternatives = (instanceId: string, ids: string[]) => {
    setSelectedWorkoutExercises(
      selectedWorkoutExercises.map((we) => {
        if (we.id !== instanceId) return we;
        const clean = cleanAlternatives(we.exerciseId, ids);
        const { alternativeIds: _old, ...rest } = we;
        return clean.length > 0 ? { ...rest, alternativeIds: clean } : rest;
      })
    );
  };

  // Descanso propio de una serie (undefined = usa el del ejercicio)
  const handleUpdateSetRest = (instanceId: string, setId: string, seconds: number | undefined) => {
    setSelectedWorkoutExercises(
      selectedWorkoutExercises.map((we) => {
        if (we.id !== instanceId) return we;
        return {
          ...we,
          sets: we.sets.map((s) => {
            if (s.id !== setId) return s;
            const { restTime: _old, ...rest } = s;
            return seconds === undefined ? rest : { ...rest, restTime: seconds };
          }),
        };
      })
    );
  };

  // Convierte las series del ejercicio en una pirámide a partir de la primera
  const handlePyramid = (instanceId: string, direction: PyramidDirection, defaultRest: number) => {
    setSelectedWorkoutExercises(
      selectedWorkoutExercises.map((we) => {
        if (we.id !== instanceId) return we;
        const base = we.sets.find((s) => !s.isWarmup) ?? we.sets[0];
        if (!base) return we;
        const warmups = we.sets.filter((s) => s.isWarmup);
        const pyramid = buildPyramid(base, we.restTime ?? defaultRest, direction, Math.max(3, Math.min(5, we.sets.length - warmups.length || 4)));
        return { ...we, sets: [...warmups, ...pyramid] };
      })
    );
  };

  const handleSave = () => {
    if (!routineName.trim()) return;

    const routineToSave: Routine = {
      id: editingRoutine ? editingRoutine.id : `routine-${Date.now()}`,
      name: routineName,
      description: routineDesc,
      dayOfWeek: routineDay,
      folder: routineFolder.trim() || undefined,
      exercises: selectedWorkoutExercises,
      // Conserva la posición manual ya asignada (si el usuario reordenó
      // carpetas/rutinas antes); si es una rutina nueva, se queda sin
      // definir hasta que el usuario la reordene por primera vez.
      folderOrder: editingRoutine?.folderOrder,
      sortOrder: editingRoutine?.sortOrder,
    };

    onSaveRoutine(routineToSave);
    setIsEditing(false);
    setEditingRoutine(null);
  };

  const editorSupersetLetters = supersetLetters(selectedWorkoutExercises);

  return (
    <div id="routines-panel" className="space-y-6 text-slate-200">
      <AnimatePresence mode="wait">
        {!isEditing ? (
          // LISTING VIEW
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="space-y-4">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-start gap-2 leading-tight">
                  <ClipboardList className="h-6 w-6 shrink-0 text-blue-400 mt-0.5" />
                  <span className="min-w-0">Tus Rutinas de Entrenamiento</span>
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Crea y personaliza un número ilimitado de rutinas para diferentes días de la semana.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button id="btn-create-routine" onClick={startNewRoutineCreation} className="btn btn-primary col-span-2 sm:col-span-1 sm:order-4">
                  <Plus />
                  Nueva Rutina
                </button>
                <button id="btn-create-folder" onClick={() => setShowNewFolderModal(true)} className="btn btn-secondary">
                  <FolderPlus className="text-blue-400" />
                  Nueva Carpeta
                </button>
                <button id="btn-starter-plans" onClick={() => setShowStarterPlans(true)} className="btn btn-secondary">
                  <Dumbbell className="text-emerald-400" />
                  Planes de iniciación
                </button>
                <button id="btn-share-plan" onClick={() => setShowSharePlan(true)} className="btn btn-secondary col-span-2 sm:col-span-1">
                  <Share2 className="text-sky-400" />
                  Compartir / importar
                </button>
              </div>
            </div>

            {routines.length > 1 && <RotationSettings routines={routines} />}

            {/* Routines agrupadas por carpeta */}
            <div className="space-y-8">
              {existingFolders.map((folder, idx) => (
                <FolderSection
                  key={folder}
                  label={folder}
                  routines={getGroupRoutines(folder)}
                  exercises={exercises}
                  isCollapsed={!expandedFolders.has(folder)}
                  onToggle={() => toggleFolder(folder)}
                  onStart={onStartRoutine}
                  onEdit={startEditingExisting}
                  onDelete={onDeleteRoutine}
                  onMoveRoutineUp={(id) => moveRoutineInGroup(folder, id, 'up')}
                  onMoveRoutineDown={(id) => moveRoutineInGroup(folder, id, 'down')}
                  accentIndex={idx}
                  onMoveFolderUp={() => moveFolder(folder, 'up')}
                  onMoveFolderDown={() => moveFolder(folder, 'down')}
                  canMoveFolderUp={idx > 0}
                  canMoveFolderDown={idx < existingFolders.length - 1}
                  onDeleteFolder={() => setFolderToDelete(folder)}
                />
              ))}

              {/* Rutinas sin carpeta asignada */}
              {(() => {
                const unfiled = getGroupRoutines(null);
                if (unfiled.length === 0) return null;
                return (
                  <FolderSection
                    label={existingFolders.length > 0 ? 'Sin carpeta' : 'Todas las rutinas'}
                    routines={unfiled}
                    exercises={exercises}
                    isCollapsed={!expandedFolders.has(NO_FOLDER)}
                    onToggle={() => toggleFolder(NO_FOLDER)}
                    onStart={onStartRoutine}
                    onEdit={startEditingExisting}
                    onDelete={onDeleteRoutine}
                    onMoveRoutineUp={(id) => moveRoutineInGroup(null, id, 'up')}
                    onMoveRoutineDown={(id) => moveRoutineInGroup(null, id, 'down')}
                  />
                );
              })()}

              {routines.length === 0 && (
                <div className="bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 p-12 text-center">
                  <ClipboardList className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-300 font-medium">No has creado rutinas</p>
                  <p className="text-slate-500 text-xs mt-1">Crea tu primera rutina para estructurar tus entrenamientos.</p>
                  <button
                    onClick={startNewRoutineCreation}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                  >
                    Crear primera rutina
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          // CREATION / EDITING WORKFLOW
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header Form */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {editingRoutine ? 'Editar Rutina' : 'Nueva Rutina Personalizada'}
                </h2>
                <p className="text-xs text-slate-400">
                  Define el nombre, días de enfoque y añade ejercicios a tu plan.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Volver
                </button>
                <button
                  id="btn-save-routine"
                  onClick={handleSave}
                  disabled={!routineName.trim() || selectedWorkoutExercises.length === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-900 disabled:text-slate-650 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  Guardar Rutina
                </button>
              </div>
            </div>

            {/* Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-4">
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                  {selectedWorkoutExercises.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Músculos que trabaja</div>
                      <MiniBodyMap sets={sessionMuscles(selectedWorkoutExercises, exercises).planned} height={110} className="flex justify-center w-full" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nombre de Rutina</label>
                    <input
                      type="text"
                      required
                      value={routineName}
                      onChange={(e) => setRoutineName(e.target.value)}
                      placeholder="Ej. Pecho Pesado, Fullbody B..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Día o Enfoque (Sugerido)</label>
                    <select
                      value={routineDay}
                      onChange={(e) => setRoutineDay(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Lunes" className="bg-slate-950 text-slate-100">Lunes</option>
                      <option value="Martes" className="bg-slate-950 text-slate-100">Martes</option>
                      <option value="Miércoles" className="bg-slate-950 text-slate-100">Miércoles</option>
                      <option value="Jueves" className="bg-slate-950 text-slate-100">Jueves</option>
                      <option value="Viernes" className="bg-slate-950 text-slate-100">Viernes</option>
                      <option value="Sábado" className="bg-slate-950 text-slate-100">Sábado</option>
                      <option value="Domingo" className="bg-slate-950 text-slate-100">Domingo</option>
                      <option value="Tirón/Empuje/Pierna" className="bg-slate-950 text-slate-100">Tirón/Empuje/Pierna</option>
                      <option value="Cualquier día" className="bg-slate-950 text-slate-100">Cualquier día</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <FolderPlus className="h-3 w-3 text-blue-400" />
                      Carpeta (opcional)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setRoutineFolder('');
                          setAddingNewFolder(false);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                          routineFolder === ''
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        Sin carpeta
                      </button>
                      {existingFolders.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => {
                            setRoutineFolder(f);
                            setAddingNewFolder(false);
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                            routineFolder === f
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          <Folder className="h-3 w-3 shrink-0" />
                          {f}
                        </button>
                      ))}
                      {/* Carpeta nueva escrita pero aún no guardada entre las existentes */}
                      {routineFolder && !existingFolders.includes(routineFolder) && !addingNewFolder && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-500 bg-blue-600 text-white flex items-center gap-1.5">
                          <Folder className="h-3 w-3 shrink-0" />
                          {routineFolder}
                          <span className="text-blue-200">(nueva)</span>
                        </span>
                      )}
                      {!addingNewFolder && (
                        <button
                          type="button"
                          onClick={() => setAddingNewFolder(true)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border border-dashed border-slate-700 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 flex items-center gap-1.5"
                        >
                          <Plus className="h-3 w-3 shrink-0" />
                          Nueva carpeta
                        </button>
                      )}
                    </div>
                    {addingNewFolder && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          autoFocus
                          value={routineFolder}
                          onChange={(e) => setRoutineFolder(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              setAddingNewFolder(false);
                            }
                          }}
                          placeholder="Nombre de la nueva carpeta..."
                          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-650"
                        />
                        <button
                          type="button"
                          onClick={() => setAddingNewFolder(false)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                        >
                          Listo
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Descripción</label>
                    <textarea
                      rows={3}
                      value={routineDesc}
                      onChange={(e) => setRoutineDesc(e.target.value)}
                      placeholder="Ej. Enfoque en hipertrofia y series ascendentes..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-650"
                    />
                  </div>
                </div>
              </div>

              {/* Routine Exercises Config */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between pb-2">
                  <h3 className="font-bold text-slate-300 text-sm uppercase tracking-wider">Ejercicios en el Plan</h3>
                  <button
                    onClick={() => setShowAddExerciseSelector(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-950/40 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-bold transition-all cursor-pointer hover:bg-blue-950/80"
                  >
                    <Plus className="h-4 w-4" />
                    Añadir Ejercicio
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedWorkoutExercises.map((we, index) => {
                    const ex = exercises.find((e) => e.id === we.exerciseId);
                    if (!ex) return null;
                    const supersetLetter = editorSupersetLetters[we.id];
                    const hasNext = index < selectedWorkoutExercises.length - 1;
                    const linkedWithNext = !!we.supersetId && we.supersetId === selectedWorkoutExercises[index + 1]?.supersetId;

                    return (
                      <div
                        key={we.id}
                        className={`bg-slate-900 border rounded-2xl shadow-lg overflow-hidden ${
                          supersetLetter ? 'border-violet-500/50 border-l-4 border-l-violet-500' : 'border-slate-800'
                        }`}
                      >
                        {supersetLetter && (
                          <div className="px-3 py-1 bg-violet-950/40 border-b border-violet-500/30 text-[10px] font-black uppercase tracking-wider text-violet-300">
                            {groupName(selectedWorkoutExercises, index)} {supersetLetter} · sin descanso entre ejercicios del grupo
                          </div>
                        )}
                        {/* Title Row */}
                        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-3">
                          {/* Reordenar ejercicio */}
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveExercise(index, 'up')}
                              disabled={index === 0}
                              title="Subir"
                              className="p-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-slate-700 disabled:opacity-25 disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveExercise(index, 'down')}
                              disabled={index === selectedWorkoutExercises.length - 1}
                              title="Bajar"
                              className="p-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-slate-700 disabled:opacity-25 disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <ExerciseThumb ex={ex} />
                          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-850 text-slate-300 text-xs font-bold border border-slate-800 shrink-0">
                                {index + 1}
                              </span>
                              <div className="font-bold text-white text-sm truncate">{ex.name}</div>
                            </div>
                            {hasNext && (
                              <button
                                type="button"
                                onClick={() => handleToggleSuperset(index)}
                                title={linkedWithNext ? 'Separar del siguiente ejercicio' : 'Hacer superserie con el siguiente ejercicio'}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer shrink-0 ${
                                  linkedWithNext
                                    ? 'bg-violet-950/40 border-violet-500/40 text-violet-300 hover:bg-violet-900/40'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {linkedWithNext ? <Link2Off className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                                <span className="hidden sm:inline">{linkedWithNext ? 'Separar' : 'Superserie'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveExercise(we.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-850 transition-all cursor-pointer shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Content Set Grid */}
                        <div className="p-4 space-y-3 bg-slate-900">
                          {/* Rest Timer Config */}
                          <div className="flex items-center gap-2 text-xs text-slate-400 pb-2 border-b border-dashed border-slate-800">
                            <Clock className="h-3.5 w-3.5 text-blue-400" />
                            <span>Descanso predeterminado:</span>
                            <button
                              type="button"
                              onClick={() => setRestPicker({ instanceId: we.id })}
                              className="px-2 py-0.5 bg-slate-950 border border-slate-800 hover:border-blue-500/50 rounded text-center font-bold text-blue-400 cursor-pointer"
                            >
                              {formatRest(we.restTime ?? ex.defaultRestTime)}
                            </button>
                          </div>

                          <WeightStackEditor exerciseId={we.exerciseId} />

                          {/* Ejercicios de repuesto: si la máquina está ocupada, se cambia por uno de estos con un toque */}
                          <div className="space-y-2 pb-2 border-b border-dashed border-slate-800">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                              <span>Si está ocupado, cambiar por:</span>
                              {(we.alternativeIds ?? []).length === 0 && <span className="text-slate-600">nada (opcional)</span>}
                              {(we.alternativeIds ?? []).map((altId) => (
                                <span key={altId} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg bg-violet-950/40 border border-violet-500/30 text-violet-300 font-bold">
                                  {exercises.find((e) => e.id === altId)?.name ?? altId}
                                  <button
                                    type="button"
                                    aria-label="Quitar alternativa"
                                    onClick={() => handleSetAlternatives(we.id, (we.alternativeIds ?? []).filter((x) => x !== altId))}
                                    className="p-0.5 text-violet-300/70 hover:text-rose-300 cursor-pointer"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            {(we.alternativeIds ?? []).length < MAX_ALTERNATIVES && (
                              <ExerciseQuickPick
                                exercises={exercises}
                                exclude={[we.exerciseId, ...(we.alternativeIds ?? [])]}
                                preferGroup={ex.muscleGroup}
                                placeholder="Añadir un ejercicio de repuesto…"
                                onPick={(alt) => handleSetAlternatives(we.id, [...(we.alternativeIds ?? []), alt.id])}
                              />
                            )}
                          </div>

                          {/* Sets Header */}
                          <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                            <span className="col-span-2 text-left">Serie</span>
                            <span className="col-span-3">{isCardio(ex) ? 'Km' : 'Peso (kg)'}</span>
                            <span className="col-span-3">{repsColumnLabel(ex, true, !!we.perSide)}</span>
                            <span className="col-span-3">Descanso</span>
                            <span className="col-span-1" />
                          </div>

                          {/* Sets Rows */}
                          {we.sets.map((set, setIndex) => (
                            <div key={set.id} className="grid grid-cols-12 gap-2 items-center text-center">
                              <button
                                type="button"
                                onClick={(e) =>
                                  setKindPicker(kindPicker?.setId === set.id ? null : { setId: set.id, anchor: e.currentTarget })
                                }
                                title="Tipo de serie"
                                className="col-span-2 text-xs font-bold text-left cursor-pointer whitespace-nowrap"
                                style={{ color: SET_KINDS.find((k) => k.kind === kindOf(set))?.color }}
                              >
                                {setLabel(we.sets, setIndex)}
                              </button>
                              {kindPicker?.setId === set.id && (
                                <AnchoredPopover anchor={kindPicker.anchor} width={256} onClose={() => setKindPicker(null)}>
                                  <SetKindMenu current={kindOf(set)} onSelect={(k) => handleSetKind(we.id, set.id, k)} />
                                </AnchoredPopover>
                              )}
                              
                              <div className="col-span-3">
                                <DecimalInput
                                  value={isCardio(ex) ? set.distance ?? 0 : set.weight}
                                  placeholder="0"
                                  onChange={(v) => handleUpdateSetValues(we.id, set.id, isCardio(ex) ? 'distance' : 'weight', v)}
                                  className="w-full text-center px-2 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-100"
                                />
                              </div>

                              <div className="col-span-3">
                                {isCardio(ex) ? (
                                  <DurationInput
                                    value={set.reps}
                                    onChange={(sec) => handleUpdateSetValues(we.id, set.id, 'reps', sec)}
                                    className="w-full text-center px-2 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-100"
                                  />
                                ) : (
                                <input
                                  type="number"
                                  min={1}
                                  value={set.reps || ''}
                                  placeholder="10"
                                  onChange={(e) => handleUpdateSetValues(we.id, set.id, 'reps', parseInt(e.target.value) || 0)}
                                  className="w-full text-center px-2 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-100"
                                />
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => setRestPicker({ instanceId: we.id, setId: set.id })}
                                title="Descanso de esta serie"
                                className={`col-span-3 px-1 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer truncate ${
                                  set.restTime !== undefined
                                    ? 'bg-blue-950/40 border-blue-500/40 text-blue-300'
                                    : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                {set.restTime !== undefined ? formatRest(set.restTime) : 'Igual'}
                              </button>

                              <div className="col-span-1 flex justify-center">
                                <button
                                  type="button"
                                  disabled={we.sets.length <= 1}
                                  onClick={() => handleRemoveSet(we.id, set.id)}
                                  className="text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-slate-500 p-1 cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Add Set Button */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5">
                            <button
                              type="button"
                              onClick={() => handleAddSet(we.id)}
                              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="h-3 w-3" /> Añadir Serie
                            </button>
                            {!isHold(ex) && (
                              <button
                                type="button"
                                onClick={() => handleTogglePerSide(we.id)}
                                aria-pressed={!!we.perSide}
                                title="Contar las repeticiones por lado (zancadas, trabajo a una mano...)"
                                className={`text-xs font-bold cursor-pointer ${we.perSide ? 'text-teal-300' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                {we.perSide ? '✓ Por lado' : 'Por lado'}
                              </button>
                            )}
                            <span className="text-[11px] text-slate-500 flex items-center gap-2">
                              Pirámide:
                              <button type="button" onClick={() => handlePyramid(we.id, 'up', ex.defaultRestTime)} title="Cada serie con más peso y menos repeticiones" className="font-bold text-violet-300 hover:text-violet-200 cursor-pointer">▲ ascendente</button>
                              <button type="button" onClick={() => handlePyramid(we.id, 'down', ex.defaultRestTime)} title="Empieza pesado y baja el peso subiendo repeticiones" className="font-bold text-violet-300 hover:text-violet-200 cursor-pointer">▼ descendente</button>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {selectedWorkoutExercises.length === 0 && (
                    <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-10 text-center">
                      <Dumbbell className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-xs font-medium">No has añadido ejercicios a esta rutina</p>
                      <button
                        type="button"
                        onClick={() => setShowAddExerciseSelector(true)}
                        className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                      >
                        Añadir Ejercicio Ahora
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Select Exercise to add to Routine */}
      <AnimatePresence>
        {showAddExerciseSelector && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl max-w-6xl w-full overflow-hidden shadow-2xl border border-slate-800 max-h-[85dvh] flex flex-col"
            >
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100">Seleccionar Ejercicio para la Rutina</h3>
                <button
                  onClick={() => setShowAddExerciseSelector(false)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-6 flex-grow bg-slate-950">
                <ExerciseLibraryPanel
                  exercises={exercises}
                  onAddCustomExercise={() => {}}
                  selectable={true}
                  onSelectExercise={handleSelectExercise}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Nueva Carpeta */}
      <AnimatePresence>
        {showNewFolderModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-800"
            >
              <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <FolderPlus className="h-5 w-5 text-blue-400 shrink-0" />
                  Nueva Carpeta
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewFolderModal(false);
                    setNewFolderName('');
                  }}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateFolderSubmit} className="p-4 sm:p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nombre de la Carpeta
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Ej. Fuerza, Verano 2026..."
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-650"
                  />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Se creará la carpeta y se abrirá el formulario para añadir tu primera rutina dentro de ella.
                </p>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewFolderModal(false);
                      setNewFolderName('');
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!newFolderName.trim()}
                    className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-900 disabled:text-slate-650 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                  >
                    Crear Carpeta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={folderToDelete !== null}
        title="Eliminar Carpeta"
        message={(() => {
          if (!folderToDelete) return '';
          const count = routines.filter((r) => r.folder === folderToDelete).length;
          if (count === 0) return `¿Eliminar la carpeta "${folderToDelete}"? Está vacía.`;
          return `¿Eliminar la carpeta "${folderToDelete}" y las ${count} ${
            count === 1 ? 'rutina que contiene' : 'rutinas que contiene'
          }? Esta acción no se puede deshacer.`;
        })()}
        confirmText="Eliminar"
        type="danger"
        onConfirm={confirmDeleteFolder}
        onCancel={() => setFolderToDelete(null)}
      />

      {restPicker && (() => {
        const we = selectedWorkoutExercises.find((x) => x.id === restPicker.instanceId);
        const exInfo = exercises.find((e) => e.id === we?.exerciseId);
        if (!we) return null;
        const set = restPicker.setId ? we.sets.find((s) => s.id === restPicker.setId) : undefined;
        const exerciseRest = we.restTime ?? exInfo?.defaultRestTime ?? 90;
        return (
          <RestTimePicker
            title={set ? 'Descanso de esta serie' : 'Descanso del ejercicio'}
            value={set ? set.restTime : we.restTime}
            fallback={exerciseRest}
            clearLabel={set ? 'Usar el del ejercicio' : undefined}
            onSelect={(sec) => {
              if (set) handleUpdateSetRest(we.id, set.id, sec);
              else handleUpdateRestTime(we.id, sec);
              setRestPicker(null);
            }}
            onClear={set ? () => { handleUpdateSetRest(we.id, set.id, undefined); setRestPicker(null); } : undefined}
            onClose={() => setRestPicker(null)}
          />
        );
      })()}

      {showSharePlan && (
        <SharePlanModal routines={routines} exercises={exercises} onImport={onAddRoutines} onClose={() => setShowSharePlan(false)} />
      )}

      {showStarterPlans && (
        <StarterPlansModal
          exercises={exercises}
          existingFolders={existingFolders}
          onAdd={onAddRoutines}
          onClose={() => setShowStarterPlans(false)}
        />
      )}
    </div>
  );
}
