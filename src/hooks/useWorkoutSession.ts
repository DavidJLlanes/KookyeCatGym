import { Dispatch, SetStateAction } from 'react';
import { ActiveWorkout, Exercise, Routine, WorkoutExercise, WorkoutLog, WorkoutSet } from '../types';
import * as api from '../api/client';
import { computeSessionRecords, formatRecordsMessage } from '../utils/records';
import { getLastPerformanceSets } from '../utils/lastPerformance';
import { ProgressionRule, prefillWithProgression } from '../utils/progressionRules';
import { deloadExercise, isDeloadWeek } from '../utils/deload';
import { detectSessionPRs, formatPRRecord, getPREmoji } from '../utils/prDetection';
import { MUSCLE_ZONE_LABEL } from '../utils/muscleZone';
import { pickSessionExercises } from '../utils/sessionBuilder';
import { buildFromExercise, buildFromRoutine } from '../utils/workoutBuild';
import { BODY_PART_LABEL } from '../utils/muscleStats';
import { defaultReps } from '../utils/holdSets';
import { activeWorkoutPhotoKey } from '../utils/photoTools';
import { UserDataShape as UserData } from '../utils/userData';
import { ConfirmFn } from './useConfirmDialog';
import { RandomWorkoutFilters } from './useRandomWorkoutFilters';
import type { AppTab } from '../components/app/AppNav';

interface WorkoutSessionDeps {
  exercises: Exercise[];
  routines: Routine[];
  logs: WorkoutLog[];
  progressionRules: ProgressionRule[];
  userData: UserData;
  activeWorkout: ActiveWorkout | null;
  saveActiveWorkoutState: (state: ActiveWorkout | null) => void;
  saveRoutines: (items: Routine[]) => Promise<void>;
  saveLogs: (items: WorkoutLog[]) => Promise<void>;
  exerciseMedia: api.MediaItem[];
  setExerciseMedia: Dispatch<SetStateAction<api.MediaItem[]>>;
  randomFilters: RandomWorkoutFilters;
  confirm: ConfirmFn;
  /** Efectos sobre la pantalla (cerrar modales, mostrar la celebración...). */
  ui: {
    closeMuscleSession: () => void;
    closeRandomWorkout: () => void;
    setJustFinishedWorkout: (log: WorkoutLog) => void;
    setRecordsMessage: (message: string | null) => void;
    goToTab: (tab: AppTab) => void;
  };
}

/**
 * Ciclo de vida de un entrenamiento: empezarlo (libre, por músculos,
 * aleatorio o desde una rutina), actualizarlo, finalizarlo y cancelarlo.
 */
export function useWorkoutSession({
  exercises, routines, logs, progressionRules, userData, activeWorkout, saveActiveWorkoutState,
  saveRoutines, saveLogs, exerciseMedia, setExerciseMedia, randomFilters, confirm, ui,
}: WorkoutSessionDeps) {
  const { randomGroups, randomZones, randomCount, randomPool } = randomFilters;

  // Start empty / free training
  const handleStartFreeWorkout = () => {
    if (activeWorkout) {
      alert('Ya tienes un entrenamiento activo. Finalízalo o cancélalo antes de iniciar uno nuevo.');
      return;
    }

    const freeWorkout = {
      routineName: 'Entrenamiento Libre',
      startTime: new Date().toISOString(),
      exercises: [],
    };
    saveActiveWorkoutState(freeWorkout);
  };

  // Sesión creada tocando músculos en el mapa
  const handleStartMuscleSession = (parts: string[]) => {
    if (activeWorkout) {
      alert('Ya tienes un entrenamiento activo. Finalízalo o cancélalo antes de iniciar uno nuevo.');
      return;
    }
    const picked = pickSessionExercises({ parts, exercises, logs, favorites: userData.favorites, equipment: userData['my-equipment'] });
    if (picked.length === 0) {
      alert('No hay ejercicios con tu equipamiento para esos músculos.');
      return;
    }
    const ctx = { logs, rules: progressionRules, stacks: userData['weight-stacks'] };
    const stamp = Date.now();
    saveActiveWorkoutState({
      routineName: `Músculos: ${parts.map((p) => BODY_PART_LABEL[p] ?? p).join(', ')}`,
      startTime: new Date().toISOString(),
      exercises: picked.map((ex, i) => buildFromExercise(ex, ctx, stamp + i)),
    });
    ui.closeMuscleSession();
  };

  // Genera el entrenamiento aleatorio con los filtros elegidos. Ya NO se lanza
  // al pulsar un grupo muscular: los chips solo seleccionan y el entrenamiento
  // arranca únicamente desde el botón "Comenzar entrenamiento".
  const handleStartRandomWorkout = () => {
    if (activeWorkout) {
      alert('Ya tienes un entrenamiento activo. Finalízalo o cancélalo antes de iniciar uno nuevo.');
      return;
    }
    if (randomPool.length === 0) return;

    const shuffled = [...randomPool].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(randomCount, shuffled.length));

    const randomExercises: WorkoutExercise[] = picked.map((ex, idx) => {
      const baseSets: WorkoutSet[] = [
        { id: `set-random-${Date.now()}-${idx}-1`, weight: 0, reps: defaultReps(ex), completed: false },
        { id: `set-random-${Date.now()}-${idx}-2`, weight: 0, reps: defaultReps(ex), completed: false },
        { id: `set-random-${Date.now()}-${idx}-3`, weight: 0, reps: defaultReps(ex), completed: false },
      ];
      return {
        id: `we-random-${Date.now()}-${idx}`,
        exerciseId: ex.id,
        restTime: ex.defaultRestTime,
        // Igual que en las rutinas: si ya se entrenó antes, viene prerrellenado
        sets: prefillWithProgression(
          baseSets,
          getLastPerformanceSets(ex.id, logs),
          progressionRules.find((r) => r.exerciseId === ex.id),
          userData['weight-stacks'][ex.id]
        ),
      };
    });

    // Nombre descriptivo según lo que se haya filtrado
    const label =
      randomGroups.length > 0
        ? randomGroups.join(', ')
        : randomZones.length > 0
          ? randomZones.map((z) => MUSCLE_ZONE_LABEL[z]).join(', ')
          : 'Variado';

    const randomWorkout = {
      routineName: `Aleatorio: ${label}`,
      startTime: new Date().toISOString(),
      exercises: randomExercises,
    };
    saveActiveWorkoutState(randomWorkout);
    ui.closeRandomWorkout();
  };

  // Start workout from a routine. Los pesos y repeticiones se prerrellenan con
  // lo que se hizo la ÚLTIMA vez con cada ejercicio (o con lo que toca según su
  // regla de progresión); `exactIds` marca los ejercicios que conservan la carga
  // de la rutina tal cual (los programas calculan la suya).
  const handleStartRoutine = (routine: Routine, exactIds: ReadonlySet<string> = new Set()) => {
    if (activeWorkout) {
      alert('Ya tienes un entrenamiento activo. Finalízalo o cancélalo antes de iniciar uno nuevo.');
      return;
    }
    const ctx = { logs, rules: progressionRules, stacks: userData['weight-stacks'] };
    const built = buildFromRoutine(routine, ctx, Date.now(), exactIds);

    // En una semana de descarga, menos series y menos peso (y se anota como tal).
    // Los programas ya traen su propia descarga.
    const inDeload = exactIds.size === 0 && isDeloadWeek(userData.deload, new Date(), userData['week-start']);
    saveActiveWorkoutState({
      routineId: routine.id,
      routineName: routine.name,
      startTime: new Date().toISOString(),
      exercises: inDeload
        ? built.map((we) => deloadExercise(we, userData.deload, exercises.find((e) => e.id === we.exerciseId), userData['weight-stacks'][we.exerciseId]))
        : built,
    });
  };

  // Update active workout callback
  const handleUpdateActiveWorkout = (updater: (prev: typeof activeWorkout) => typeof activeWorkout) => {
    const updated = updater(activeWorkout);
    saveActiveWorkoutState(updated);
  };

  // Finish active workout helper to execute saving after optional confirmation
  const executeFinishWorkout = (durationSeconds: number, loggedExercises: WorkoutExercise[]) => {
    if (!activeWorkout) return;

    // PRIMERO: limpiar el active_workout (antes de guardar el log)
    saveActiveWorkoutState(null); // Reset active

    // LUEGO: guardar el log
    const newLog: WorkoutLog = {
      id: `log-${Date.now()}`,
      routineId: activeWorkout.routineId,
      routineName: activeWorkout.routineName,
      date: new Date().toISOString(),
      duration: durationSeconds,
      exercises: loggedExercises,
    };

    const newLogsList = [newLog, ...logs];
    saveLogs(newLogsList);

    // Las fotos hechas durante el entrenamiento pasan a este entrenamiento del historial
    const photoKey = activeWorkoutPhotoKey(activeWorkout.startTime);
    if (exerciseMedia.some((m) => m.kind === 'workout' && m.logId === photoKey)) {
      setExerciseMedia((prev) => prev.map((m) => (m.kind === 'workout' && m.logId === photoKey ? { ...m, logId: newLog.id } : m)));
      api.relinkWorkoutMedia(photoKey, newLog.id).catch((err) => console.error('No se pudieron mover las fotos del entrenamiento', err));
    }

    // Calcula si se han batido récords de peso/repeticiones frente al histórico previo
    const summary = computeSessionRecords(loggedExercises, logs, exercises);
    const recordsMessage = formatRecordsMessage(summary);
    ui.setRecordsMessage(recordsMessage);

    // Detect PRs using new enhanced PR Detection system
    const exerciseNameMap = new Map(exercises.map((e) => [e.id, e.name]));
    const prSession = detectSessionPRs(
      {
        routineName: activeWorkout.routineName,
        exercises: loggedExercises,
      },
      exerciseNameMap,
      logs
    );

    // Si se detectaron PRs, agregar un mensaje adicional
    if (prSession.isNewSessionPR && prSession.records.length > 0) {
      const prMessages = prSession.records.map((pr) => `${getPREmoji(pr.percentage)} ${formatPRRecord(pr)}`).join('\n');
      const fullMessage = recordsMessage ? `${recordsMessage}\n\n${prMessages}` : prMessages;
      ui.setRecordsMessage(fullMessage);
    }

    // Trigger celebration modal and navigate to progress tab
    ui.setJustFinishedWorkout(newLog);
    ui.goToTab('progress');
  };

  // "Huella" de la estructura de una rutina/entrenamiento: qué ejercicios,
  // en qué orden, cuántas series y con qué descanso. Deliberadamente NO
  // incluye peso/repeticiones (eso cambia cada sesión por diseño: no tiene
  // sentido preguntar "¿actualizar la rutina?" solo porque hoy se levantó
  // más peso). Solo detecta cambios reales de plantilla: ejercicios o
  // series añadidos/quitados, reordenados, o descanso modificado.
  const getWorkoutStructureSignature = (items: WorkoutExercise[]): string =>
    items.map((it) => `${it.exerciseId}:${it.sets.length}:${it.restTime ?? ''}`).join('|');

  // Convierte el entrenamiento activo en la forma que se guarda en una
  // rutina (mismas series/descanso, pero sin marcar nada como completado).
  const buildRoutineExercisesFromWorkout = (items: WorkoutExercise[]): WorkoutExercise[] =>
    items.map((we) => ({
      id: we.id,
      exerciseId: we.exerciseId,
      restTime: we.restTime,
      ...(we.supersetId ? { supersetId: we.supersetId } : {}),
      ...(we.alternativeIds && we.alternativeIds.length > 0 ? { alternativeIds: we.alternativeIds } : {}),
      ...(we.perSide ? { perSide: true } : {}),
      sets: we.sets.map((s) => ({
        id: s.id,
        weight: s.weight,
        reps: s.reps,
        completed: false,
        // Se conservan los tipos de serie y el descanso propio de cada una
        ...(s.isWarmup ? { isWarmup: true } : {}),
        ...(s.setType ? { setType: s.setType } : {}),
        ...(s.restTime !== undefined ? { restTime: s.restTime } : {}),
        ...(s.distance !== undefined ? { distance: s.distance } : {}),
      })),
    }));

  // Si el entrenamiento se inició desde una rutina y, durante la sesión, se
  // añadieron/quitaron ejercicios o series respecto a esa rutina, pregunta
  // si se quiere guardar esos cambios como la nueva plantilla o mantener la
  // rutina original. En cualquier caso, el entrenamiento se finaliza igual.
  const finishConsideringRoutineChanges = (durationSeconds: number, loggedExercises: WorkoutExercise[]) => {
    const workout = activeWorkout;
    const sourceRoutine = workout?.routineId ? routines.find((r) => r.id === workout.routineId) : null;

    if (workout && sourceRoutine) {
      // En una semana de descarga las series se recortan a propósito: eso no es un cambio de plantilla
      const changed =
        !workout.exercises.some((we) => we.deload) &&
        getWorkoutStructureSignature(workout.exercises) !== getWorkoutStructureSignature(sourceRoutine.exercises);

      if (changed) {
        confirm({
          title: 'Rutina modificada',
          message: `Has añadido, quitado o cambiado ejercicios/series respecto a la rutina guardada "${sourceRoutine.name}". ¿Quieres guardar estos cambios en la rutina para la próxima vez, o mantener la rutina original?`,
          confirmText: 'Guardar cambios en la rutina',
          cancelText: 'Mantener rutina original',
          type: 'info',
          onConfirm: () => {
            saveRoutines(
              routines.map((r) =>
                r.id === sourceRoutine.id ? { ...r, exercises: buildRoutineExercisesFromWorkout(workout.exercises) } : r
              )
            );
            executeFinishWorkout(durationSeconds, loggedExercises);
          },
          onCancel: () => {
            executeFinishWorkout(durationSeconds, loggedExercises);
          },
        });
        return;
      }
    }

    executeFinishWorkout(durationSeconds, loggedExercises);
  };

  // Finish active workout
  const handleFinishWorkout = (durationSeconds: number) => {
    if (!activeWorkout) return;

    // Filter out exercises that have absolutely zero sets checked as complete
    const loggedExercises = activeWorkout.exercises.filter((we) =>
      we.sets.some((s) => s.completed)
    );

    if (loggedExercises.length === 0) {
      confirm({
        title: 'Finalizar Entrenamiento Vacío',
        message: 'No has marcado ninguna serie como completada en este entrenamiento. ¿Deseas finalizarlo de todos modos?',
        confirmText: 'Sí, finalizar',
        type: 'warning',
        onConfirm: () => {
          // setTimeout: deja que este diálogo termine de cerrarse antes de
          // posiblemente abrir el de "rutina modificada" a continuación
          // (encadenar dos confirm en el mismo tick pisaría el segundo).
          setTimeout(() => finishConsideringRoutineChanges(durationSeconds, []), 0);
        },
      });
      return;
    }

    finishConsideringRoutineChanges(durationSeconds, loggedExercises);
  };

  const handleCancelWorkout = () => {
    saveActiveWorkoutState(null);
  };

  return {
    handleStartFreeWorkout, handleStartMuscleSession, handleStartRandomWorkout, handleStartRoutine,
    handleUpdateActiveWorkout, handleFinishWorkout, handleCancelWorkout,
  };
}
