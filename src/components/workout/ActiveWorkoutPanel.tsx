import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronUp, ClipboardList, Dumbbell, Plus } from 'lucide-react';
import type { ActiveWorkout, Exercise, Routine, WorkoutExercise, WorkoutLog, WorkoutSet } from '../../types';
import type { MediaItem } from '../../api/client';
import { testPush } from '../../api/client';
import { useUserData } from '../../context/UserDataContext';
import { useElapsedSeconds } from '../../hooks/useElapsedSeconds';
import { useHoldTimer, type HoldRun } from '../../hooks/useHoldTimer';
import { parseBool, parseIntInRange, useLocalPref } from '../../hooks/useLocalPref';
import { useRestTimer } from '../../hooks/useRestTimer';
import { useWakeLock } from '../../hooks/useWakeLock';
import { formatClock } from '../../utils/clock';
import { detectSetAnomaly } from '../../utils/anomaly';
import { isCardio, isHold } from '../../utils/holdSets';
import { getLastPerformanceSets } from '../../utils/lastPerformance';
import type { ProgressionRule } from '../../utils/progressionRules';
import { disableRestPush, enableRestPush, isRestPushEnabled, scheduleRestPush } from '../../utils/restPush';
import { MAX_REST_SECONDS } from '../../utils/restTimes';
import { groupName, restAfterSet, supersetLetters } from '../../utils/setTypes';
import { buildFromExercise, buildFromRoutine, type PrefillContext } from '../../utils/workoutBuild';
import * as edit from '../../utils/workoutMutations';
import ConfirmDialog from '../ConfirmDialog';
import ExerciseHistoryModal from '../ExerciseHistoryModal';
import RestTimePicker from '../RestTimePicker';
import WorkoutPhotos from '../WorkoutPhotos';
import AddExerciseModal from './AddExerciseModal';
import AddRoutineModal from './AddRoutineModal';
import ExerciseCard from './ExerciseCard';
import HoldTimerBar from './HoldTimerBar';
import RestTimerBar from './RestTimerBar';
import SessionMusclesSheet from './SessionMusclesSheet';
import WorkoutHeader from './WorkoutHeader';
import type { ExerciseActions, WorkoutView } from './types';

/** Segundos de cuenta atrás para colocarse antes de aguantar una plancha, un colgado... */
const HOLD_READY_SECONDS = 5;
const DEFAULT_REST_SECONDS = 90;
const UNDO_SECONDS = 6;

interface ActiveWorkoutPanelProps {
  activeWorkout: ActiveWorkout | null;
  exercises: Exercise[];
  logs: WorkoutLog[];
  routines: Routine[];
  progressionRules: ProgressionRule[];
  onUpdateWorkout: (updater: (prev: ActiveWorkout | null) => ActiveWorkout | null) => void;
  onFinishWorkout: (durationSeconds: number) => void;
  onCancelWorkout: () => void;
  onOpenPlateCalculator?: () => void;
  /** Fotos de este entrenamiento (se pueden añadir en cualquier momento). */
  photos?: MediaItem[];
  onUploadPhoto?: (file: File, onProgress: (fraction: number) => void) => Promise<void>;
  onDeletePhoto?: (id: string) => Promise<void>;
}

interface ConfirmState {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

/**
 * Entrenamiento en curso: una barra plegada abajo que se despliega a pantalla
 * completa. Este componente solo coordina el estado y los temporizadores; cada
 * parte de la pantalla vive en su propio archivo de esta carpeta.
 */
export default function ActiveWorkoutPanel({
  activeWorkout,
  exercises,
  logs,
  routines,
  progressionRules,
  onUpdateWorkout,
  onFinishWorkout,
  onCancelWorkout,
  onOpenPlateCalculator,
  photos = [],
  onUploadPhoto,
  onDeletePhoto,
}: ActiveWorkoutPanelProps) {
  const { data: userData } = useUserData();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [showRestWheel, setShowRestWheel] = useState(false);
  const [showMuscles, setShowMuscles] = useState(false);
  const [historyFor, setHistoryFor] = useState<Exercise | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [undoSet, setUndoSet] = useState<{ weId: string; set: WorkoutSet; index: number } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ajustes que se recuerdan en este dispositivo. Las dos primeras claves vienen de
  // versiones anteriores de la app: se conservan para no perder las preferencias.
  const [restEnabled, setRestEnabled] = useLocalPref('hevy_rest_timer_enabled', true, parseBool);
  const [defaultRest, setDefaultRest] = useLocalPref('hevy_default_rest_seconds', DEFAULT_REST_SECONDS, parseIntInRange(0, MAX_REST_SECONDS));
  const [view, setView] = useLocalPref<WorkoutView>('zgym_workout_view', 'cards', (raw) => (raw === 'list' || raw === 'cards' ? raw : undefined));
  const [holdAuto, setHoldAuto] = useLocalPref('zgym_hold_auto', false, (raw) => raw === 'true');

  // Aviso de fin de descanso con la app cerrada (notificación push)
  const [pushOn, setPushOn] = useState(isRestPushEnabled);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [headerPhotoProgress, setHeaderPhotoProgress] = useState<number | null>(null);

  const workout = activeWorkout;
  const workoutRef = useRef(workout);
  workoutRef.current = workout;
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const elapsedSeconds = useElapsedSeconds(workout?.startTime);
  useWakeLock(!!workout);

  const update = (fn: (w: ActiveWorkout) => ActiveWorkout) => onUpdateWorkout((prev) => (prev ? fn(prev) : prev));

  // --- Descanso entre series -------------------------------------------------

  const lastDoneWeId = useRef<string | null>(null);

  const rest = useRestTimer({
    active: !!workout,
    // Con «Auto» activado, al acabar el descanso empieza solo la siguiente serie por tiempo
    onFinished: () => {
      const w = workoutRef.current;
      const we = w?.exercises.find((x) => x.id === lastDoneWeId.current);
      const ex = we && exerciseById.get(we.exerciseId);
      if (!holdAuto || !we || !ex || !isHold(ex) || isCardio(ex) || hold.run) return;
      const next = we.sets.find((s) => !s.completed && s.reps > 0);
      if (next) startHold(we, next, ex.name);
    },
  });

  /** Arranca el descanso que corresponde tras completar una serie (drop sets, superseries y pirámides incluidos). */
  const startRestAfter = (w: ActiveWorkout, weId: string, setId: string, exerciseName: string) => {
    lastDoneWeId.current = weId;
    if (!restEnabled) return;
    const found = edit.findSet(w, weId, setId);
    if (!found) return;
    const exIndex = w.exercises.findIndex((x) => x.id === weId);
    // `??` y no `||`: un descanso de 0 s es válido («sin descanso»)
    const normal = found.exercise.restTime ?? exerciseById.get(found.exercise.exerciseId)?.defaultRestTime ?? DEFAULT_REST_SECONDS;
    const seconds = restAfterSet(w.exercises, exIndex, found.setIndex, found.set.restTime ?? normal);
    if (seconds > 0) rest.start(seconds, exerciseName);
  };

  // --- Series por tiempo (plancha, colgados...) ------------------------------

  const hold = useHoldTimer({
    readySeconds: HOLD_READY_SECONDS,
    onComplete: (run, heldSeconds) => {
      const w = workoutRef.current;
      update((prev) => edit.completeWithReps(prev, run.weId, run.setId, heldSeconds));
      if (w) startRestAfter(w, run.weId, run.setId, run.exerciseName);
    },
  });

  const startHold = (we: WorkoutExercise, set: WorkoutSet, exerciseName: string) => {
    rest.dismiss();
    const run: HoldRun = { weId: we.id, setId: set.id, exerciseName, targetSeconds: set.reps };
    hold.start(run);
  };

  // --- Acciones sobre series y ejercicios ------------------------------------

  const applyToggle = (weId: string, setId: string, exerciseName: string) => {
    const w = workoutRef.current;
    const found = w && edit.findSet(w, weId, setId);
    if (!w || !found) return;
    update((prev) => edit.toggleCompleted(prev, weId, setId));
    if (!found.set.completed) startRestAfter(w, weId, setId, exerciseName);
  };

  // Al marcar una serie se comprueba si el peso o las repeticiones son
  // anormalmente altos para ese ejercicio (típico error de tecleo: «89» en vez
  // de «8») y se pide confirmación antes de darla por buena.
  const requestToggle = (weId: string, setId: string) => {
    const w = workoutRef.current;
    const found = w && edit.findSet(w, weId, setId);
    if (!found) return;
    const name = exerciseById.get(found.exercise.exerciseId)?.name ?? '';
    if (!found.set.completed) {
      const anomaly = detectSetAnomaly(found.exercise.exerciseId, found.set.weight, found.set.reps, logs);
      if (anomaly) {
        setConfirm({
          title: 'Valor inusual',
          message: anomaly.message,
          confirmText: 'Sí, es correcto',
          cancelText: 'Corregir',
          type: 'warning',
          onConfirm: () => applyToggle(weId, setId, name),
        });
        return;
      }
    }
    applyToggle(weId, setId, name);
  };

  const removeSet = (weId: string, setId: string) => {
    const w = workoutRef.current;
    if (!w) return;
    const { workout: next, removed } = edit.removeSet(w, weId, setId);
    if (!removed) return;
    update(() => next);
    setUndoSet(removed);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoSet(null), UNDO_SECONDS * 1000);
  };

  const undoRemoveSet = () => {
    if (!undoSet) return;
    update((prev) => edit.restoreSet(prev, undoSet.weId, undoSet.set, undoSet.index));
    setUndoSet(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  const prefillContext = (): PrefillContext => ({ logs, rules: progressionRules, stacks: userData['weight-stacks'] });

  const actions: ExerciseActions = {
    onField: (weId, setId, field, value) => update((prev) => edit.updateSetField(prev, weId, setId, field, value)),
    onToggleComplete: requestToggle,
    onKind: (weId, setId, kind) => update((prev) => edit.setKind(prev, weId, setId, kind)),
    onRpe: (weId, setId, rpe) => update((prev) => edit.setRpe(prev, weId, setId, rpe)),
    onRemove: removeSet,
    onDuplicate: (weId, setId) => update((prev) => edit.duplicateSet(prev, weId, setId)),
    onAdd: (weId) => update((prev) => edit.addSet(prev, weId)),
    onHistory: setHistoryFor,
    onTogglePerSide: (weId) => update((prev) => edit.togglePerSide(prev, weId)),
    onToggleSuperset: (index) => update((prev) => edit.toggleSupersetAt(prev, index)),
    onRemoveExercise: (weId) =>
      setConfirm({
        title: 'Quitar Ejercicio',
        message: '¿Seguro que quieres quitar este ejercicio del entrenamiento actual?',
        confirmText: 'Quitar',
        type: 'danger',
        onConfirm: () => update((prev) => edit.removeExercise(prev, weId)),
      }),
    onSwap: (weId, alternativeId) => {
      const replacement = exerciseById.get(alternativeId);
      if (!replacement) return;
      const last = getLastPerformanceSets(alternativeId, logs);
      update((prev) => edit.swapExercise(prev, weId, replacement, last));
    },
    onStartHold: startHold,
  };

  const addExercise = (ex: Exercise) => {
    const built = buildFromExercise(ex, prefillContext());
    update((prev) => edit.appendExercises(prev, [built]));
    setShowAddExercise(false);
  };

  const addRoutine = (routine: Routine) => {
    const built = buildFromRoutine(routine, prefillContext());
    update((prev) => edit.appendExercises(prev, built, routine.name));
    setShowAddRoutine(false);
  };

  // --- Ajustes de la cabecera ------------------------------------------------

  const toggleRestEnabled = () => {
    if (restEnabled) rest.dismiss(); // al desactivarlo se cancela el descanso en marcha
    setRestEnabled(!restEnabled);
  };

  const changeDefaultRest = (seconds: number) => {
    const clamped = Math.min(MAX_REST_SECONDS, Math.max(0, seconds));
    setDefaultRest(clamped);
    update((prev) => edit.setAllRestTimes(prev, clamped));
  };

  const togglePush = async () => {
    setPushMessage(null);
    setPushBusy(true);
    try {
      if (pushOn) {
        await disableRestPush();
        setPushOn(false);
      } else {
        await enableRestPush();
        setPushOn(true);
        const res = await testPush().catch(() => null);
        setPushMessage(
          res?.success
            ? 'Avisos activados: te ha llegado una notificación de prueba.'
            : 'Avisos activados, pero la notificación de prueba no salió. Revisa los permisos del navegador.'
        );
        const endsAt = rest.endsAt();
        if (endsAt) scheduleRestPush(endsAt, rest.exerciseName); // si ya hay un descanso contando, se programa su aviso
      }
    } catch (err) {
      setPushMessage(err instanceof Error ? err.message : 'No se pudieron activar los avisos.');
    } finally {
      setPushBusy(false);
    }
  };

  const uploadHeaderPhotos = async (files: File[]) => {
    if (!onUploadPhoto) return;
    try {
      for (const file of files) {
        setHeaderPhotoProgress(0);
        await onUploadPhoto(file, setHeaderPhotoProgress);
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo subir la foto.');
    } finally {
      setHeaderPhotoProgress(null);
    }
  };

  useEffect(() => () => undoTimer.current && clearTimeout(undoTimer.current), []);

  if (!workout) return null;

  const letters = supersetLetters(workout.exercises);
  const firstPendingId = workout.exercises.find((we) => we.sets.some((s) => !s.completed))?.id;
  const hasTimed = workout.exercises.some((we) => {
    const ex = exerciseById.get(we.exerciseId);
    return !!ex && isHold(ex) && !isCardio(ex);
  });

  return (
    <>
      {/* Barra plegada (deja libre la barra de pestañas móvil y el home indicator de iOS) */}
      {!isExpanded && (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-4 left-3 right-3 z-40 bg-slate-900 text-white rounded-2xl p-3 shadow-xl border border-slate-700 flex items-center justify-between gap-2 max-w-xl mx-auto">
          <div className="flex items-center gap-3 min-w-0" onClick={() => setIsExpanded(true)}>
            <div className="hidden min-[400px]:flex h-10 w-10 bg-blue-600 rounded-lg items-center justify-center animate-pulse shrink-0">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <div className="cursor-pointer text-left min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight truncate">Entrenamiento activo</div>
              <div className="font-bold text-sm leading-tight truncate">{workout.routineName}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs min-[400px]:text-sm font-bold bg-slate-850 px-2 min-[400px]:px-2.5 py-1 rounded-lg text-blue-400 border border-blue-500/25">
              {formatClock(elapsedSeconds)}
            </span>
            <button
              type="button"
              id="btn-expand-workout"
              onClick={() => setIsExpanded(true)}
              className="icon-btn !h-10 !w-10 border-transparent"
              title="Expandir"
              aria-label="Expandir el entrenamiento"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isExpanded && (
          <div
            // Fondo SÓLIDO a propósito (sin backdrop-blur): este panel se repinta cada segundo por
            // el cronómetro y en móvil un desenfoque se re-rasteriza entero en cada repintado.
            className="fixed inset-0 bg-slate-950/95 z-50 flex items-end justify-center"
            onClick={(e) => e.target === e.currentTarget && setIsExpanded(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-slate-900 w-full max-w-3xl rounded-t-3xl h-[92dvh] flex flex-col overflow-hidden shadow-2xl border-t border-slate-800"
            >
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                title="Minimizar"
                className="py-2.5 bg-slate-900 flex flex-col items-center justify-center gap-1 cursor-pointer border-b border-slate-800 hover:bg-slate-850/50 transition-colors"
              >
                <div className="w-12 h-1 bg-slate-700 rounded-full" />
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <ChevronDown className="h-3 w-3" />
                  Minimizar
                </span>
              </button>

              <WorkoutHeader
                routineName={workout.routineName}
                elapsedSeconds={elapsedSeconds}
                rest={{ enabled: restEnabled, onToggleEnabled: toggleRestEnabled, defaultSeconds: defaultRest, onOpenWheel: () => setShowRestWheel(true) }}
                push={{ on: pushOn, busy: pushBusy, message: pushMessage, onToggle: togglePush }}
                view={view}
                onViewChange={setView}
                holdAuto={hasTimed ? { on: holdAuto, onToggle: () => setHoldAuto(!holdAuto) } : undefined}
                photos={onUploadPhoto ? { count: photos.length, progress: headerPhotoProgress, onFiles: uploadHeaderPhotos } : undefined}
                onOpenPlateCalculator={onOpenPlateCalculator}
                onOpenMuscles={() => setShowMuscles(true)}
                onMinimize={() => setIsExpanded(false)}
                onCancel={() =>
                  setConfirm({
                    title: 'Cancelar Entrenamiento',
                    message: '¿Seguro que deseas cancelar este entrenamiento? Se perderán todos los datos actuales.',
                    confirmText: 'Sí, cancelar',
                    type: 'danger',
                    onConfirm: () => {
                      onCancelWorkout();
                      setIsExpanded(false);
                    },
                  })
                }
                onFinish={() => {
                  onFinishWorkout(elapsedSeconds);
                  setIsExpanded(false);
                }}
              >
                <HoldTimerBar timer={hold} />
                <RestTimerBar timer={rest} />
              </WorkoutHeader>

              <div className="flex-1 overflow-y-auto bg-slate-950 px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-6">
                <div className={view === 'list' ? 'space-y-3' : 'space-y-6'}>
                  {workout.exercises.map((we, index) => {
                    const exercise = exerciseById.get(we.exerciseId);
                    if (!exercise) return null;
                    const next = workout.exercises[index + 1];
                    return (
                      <ExerciseCard
                        key={we.id}
                        index={index}
                        we={we}
                        exercise={exercise}
                        alternatives={(we.alternativeIds ?? []).map((id) => exerciseById.get(id)).filter((e): e is Exercise => !!e)}
                        hasNext={!!next}
                        linkedWithNext={!!we.supersetId && we.supersetId === next?.supersetId}
                        groupLetter={letters[we.id]}
                        groupLabel={letters[we.id] ? groupName(workout.exercises, index) : undefined}
                        view={view}
                        open={openIds[we.id] ?? we.id === firstPendingId}
                        onToggleOpen={() => setOpenIds((prev) => ({ ...prev, [we.id]: !(prev[we.id] ?? we.id === firstPendingId) }))}
                        stack={userData['weight-stacks'][we.exerciseId]}
                        actions={actions}
                      />
                    );
                  })}
                </div>

                <button
                  type="button"
                  id="btn-add-exercise-active"
                  onClick={() => setShowAddExercise(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-900 hover:bg-slate-850 text-slate-200 font-bold text-sm rounded-2xl transition-colors cursor-pointer border border-dashed border-slate-800"
                >
                  <Plus className="h-4.5 w-4.5 text-blue-400" />
                  Agregar Ejercicio al Entrenamiento
                </button>
                {onUploadPhoto && onDeletePhoto && (
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                    <WorkoutPhotos title={workout.routineName} photos={photos} onUpload={onUploadPhoto} onDelete={onDeletePhoto} />
                  </div>
                )}
                {routines.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddRoutine(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold text-sm rounded-2xl transition-colors cursor-pointer border border-dashed border-slate-800"
                  >
                    <ClipboardList className="h-4.5 w-4.5 text-blue-400" />
                    Añadir otra rutina a esta sesión
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AddExerciseModal open={showAddExercise} exercises={exercises} onSelect={addExercise} onClose={() => setShowAddExercise(false)} />
      <AddRoutineModal open={showAddRoutine} routines={routines} onSelect={addRoutine} onClose={() => setShowAddRoutine(false)} />
      {historyFor && <ExerciseHistoryModal exercise={historyFor} logs={logs} onClose={() => setHistoryFor(null)} />}
      {showMuscles && <SessionMusclesSheet workout={workout} exercises={exercises} onClose={() => setShowMuscles(false)} />}

      {undoSet && (
        <div
          role="status"
          className="fixed left-1/2 -translate-x-1/2 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[120] flex items-center gap-4 pl-4 pr-2 py-2 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl text-sm text-slate-100"
        >
          Serie eliminada
          <button type="button" onClick={undoRemoveSet} className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer">
            Deshacer
          </button>
        </div>
      )}

      {showRestWheel && (
        <RestTimePicker
          title="Descanso de este entrenamiento"
          value={defaultRest}
          fallback={defaultRest}
          onSelect={(sec) => {
            changeDefaultRest(sec);
            setShowRestWheel(false);
          }}
          onClose={() => setShowRestWheel(false)}
        />
      )}

      <ConfirmDialog
        isOpen={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmText={confirm?.confirmText}
        cancelText={confirm?.cancelText}
        type={confirm?.type}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
