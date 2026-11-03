import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Dumbbell, X, Folder, FolderPlus} from 'lucide-react';
import RoutineExerciseEditor from './RoutineExerciseEditor';
import { Routine, Exercise, WorkoutExercise, WorkoutSet } from '../../types';
import ExerciseLibraryPanel from '../ExerciseLibraryPanel';
import { defaultReps, isHold, looksUnilateral } from '../../utils/holdSets';
import { SetKind, withKind, supersetLetters, toggleSupersetWithNext, normalizeSupersets} from '../../utils/setTypes';
import RestTimePicker from '../RestTimePicker';
import { cleanAlternatives} from '../../utils/exerciseSwap';
import { buildPyramid, PyramidDirection } from '../../utils/pyramid';
import MiniBodyMap from '../muscle/MiniBodyMap';
import { sessionMuscles } from '../../utils/sessionMuscles';

interface RoutineEditorProps {
  /** Rutina que se edita; null = rutina nueva. */
  routine: Routine | null;
  exercises: Exercise[];
  existingFolders: string[];
  onSave: (routine: Routine) => void;
  onCancel: () => void;
}

/**
 * Formulario para crear o editar una rutina: nombre, día, carpeta y la lista
 * de ejercicios con sus series, descansos, superseries y alternativas.
 */
export default function RoutineEditor({ routine, exercises, existingFolders, onSave, onCancel }: RoutineEditorProps) {
  const [routineName, setRoutineName] = useState(routine?.name ?? '');
  const [routineDesc, setRoutineDesc] = useState(routine?.description ?? '');
  const [routineDay, setRoutineDay] = useState(routine?.dayOfWeek || 'Lunes');
  const [routineFolder, setRoutineFolder] = useState(routine?.folder || '');
  const [addingNewFolder, setAddingNewFolder] = useState(false);
  // Copia profunda: no se muta la rutina original mientras se edita
  const [selectedWorkoutExercises, setSelectedWorkoutExercises] = useState<WorkoutExercise[]>(
    () => (routine ? JSON.parse(JSON.stringify(routine.exercises)) : [])
  );
  const [showAddExerciseSelector, setShowAddExerciseSelector] = useState(false);
  // Rueda de descanso abierta: de un ejercicio entero o de una serie concreta
  const [restPicker, setRestPicker] = useState<{ instanceId: string; setId?: string } | null>(null);

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
      id: routine ? routine.id : `routine-${Date.now()}`,
      name: routineName,
      description: routineDesc,
      dayOfWeek: routineDay,
      folder: routineFolder.trim() || undefined,
      exercises: selectedWorkoutExercises,
      // Conserva la posición manual ya asignada (si el usuario reordenó
      // carpetas/rutinas antes); si es una rutina nueva, se queda sin
      // definir hasta que el usuario la reordene por primera vez.
      folderOrder: routine?.folderOrder,
      sortOrder: routine?.sortOrder,
    };

    onSave(routineToSave);
  };

  const editorSupersetLetters = supersetLetters(selectedWorkoutExercises);

  return (
    <>
      {/* Header Form */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {routine ? 'Editar Rutina' : 'Nueva Rutina Personalizada'}
          </h2>
          <p className="text-xs text-slate-400">
            Define el nombre, días de enfoque y añade ejercicios a tu plan.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onCancel()}
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
            {selectedWorkoutExercises.map((we, index) => (
              <RoutineExerciseEditor
                key={we.id}
                we={we}
                index={index}
                items={selectedWorkoutExercises}
                exercises={exercises}
                supersetLetter={editorSupersetLetters[we.id]}
                onOpenRestPicker={setRestPicker}
                handlers={{
                  handleAddSet, handleMoveExercise, handlePyramid, handleRemoveExercise, handleRemoveSet,
                  handleSetAlternatives, handleSetKind, handleTogglePerSide, handleToggleSuperset, handleUpdateSetValues,
                }}
              />
            ))}

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

    </>
  );
}
