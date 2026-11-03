import { useEffect, useMemo, useRef, useState } from 'react';
import { Exercise, Routine, WorkoutLog } from '../types';
import { DEFAULT_ROUTINES, DEFAULT_LOGS } from '../data/seed';
import * as api from '../api/client';
import { ProgressionRule } from '../utils/progressionRules';
import { remapWorkoutList, remapActiveWorkout, remapByExerciseId } from '../utils/exerciseIds';
import { deepEqual, mergeCollection, mergeRecord } from '../utils/threeWayMerge';
import { assetUrl } from '../utils/assetUrl';
import { useActiveWorkoutStore, ACTIVE_WORKOUT_DELETE_PENDING_KEY } from './useActiveWorkoutStore';

/**
 * Todos los datos del usuario (ejercicios, rutinas, historial, reglas de
 * progresión, fotos y entrenamiento activo): carga inicial, guardado con
 * fusión de tres vías entre dispositivos y sincronización al volver a la app.
 */
export function useGymData() {
  // --- PERSISTENT STATE LAYERS ---
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [progressionRules, setProgressionRules] = useState<ProgressionRule[]>([]);
  const existingLogIds = useMemo(() => new Set(logs.map((l) => l.id)), [logs]);
  const [exerciseMedia, setExerciseMedia] = useState<api.MediaItem[]>([]);
  // Para mostrar: los ejercicios con tu foto principal en lugar de la del
  // catálogo. `exercises` no se toca, que es lo que se guarda en el servidor.
  // Fotos por tipo: de ejercicios, de entrenamientos y de progreso físico
  const exerciseOnlyMedia = useMemo(() => exerciseMedia.filter((m) => (m.kind ?? 'exercise') === 'exercise'), [exerciseMedia]);
  const workoutPhotos = useMemo(() => exerciseMedia.filter((m) => m.kind === 'workout'), [exerciseMedia]);
  const progressPhotos = useMemo(() => exerciseMedia.filter((m) => m.kind === 'progress'), [exerciseMedia]);
  const displayExercises = useMemo(() => {
    const primaryByExercise = new Map(exerciseOnlyMedia.filter((m) => m.isPrimary).map((m) => [m.exerciseId, m.url]));
    // Las rutas «/exercises/…» del catálogo se completan con la subcarpeta de la app, si la hay
    return exercises.map((e) =>
      primaryByExercise.has(e.id)
        ? { ...e, imageUrl: primaryByExercise.get(e.id)!, videoUrl: undefined }
        : { ...e, imageUrl: assetUrl(e.imageUrl), videoUrl: e.videoUrl ? assetUrl(e.videoUrl) : e.videoUrl }
    );
  }, [exercises, exerciseOnlyMedia]);

  // Lo último que este dispositivo vio del servidor (rutinas y entrenamientos).
  // Es la versión BASE de la fusión de tres vías: permite combinar lo que se
  // editó aquí con lo que se editó a la vez en otro dispositivo.
  const routinesBase = useRef<Map<string, Routine>>(new Map());
  const logsBase = useRef<Map<string, WorkoutLog>>(new Map());
  const activeStore = useActiveWorkoutStore();
  const { setActiveWorkout, deleteActiveWorkoutWithRetry } = activeStore;

  // 1. Initial mounting loaders
  useEffect(() => {
    const loadData = async () => {
      // El catálogo de 873 ejercicios (~1.1MB) se carga en paralelo con las
      // llamadas a la API, como chunk aparte, en vez de venir en el bundle
      // inicial (así el login y el primer render no esperan por él).
      const exercisesModulePromise = import('../data/exercises');

      try {
        // Try loading from API first
        const [remoteEx, remoteRout, remoteLogs, remoteActiveRaw, exercisesModule, remoteRules] = await Promise.all([
          api.getExercises().catch(() => null),
          api.getRoutines().catch(() => null),
          api.getLogs().catch(() => null),
          api.getActiveWorkout().catch(() => null),
          exercisesModulePromise,
          api.getProgressionRules().catch(() => []),
        ]);
        setProgressionRules(Array.isArray(remoteRules) ? remapByExerciseId(remoteRules) : []);
        api
          .getMyMedia()
          .then((items) => setExerciseMedia(Array.isArray(items) ? remapByExerciseId(items) : []))
          .catch(() => {});
        let remoteActive = remoteActiveRaw;

        // Si en una sesión anterior no se pudo confirmar en el servidor el
        // borrado del entrenamiento activo (fallo de red al finalizar o
        // cancelar), lo reintentamos ahora, antes de mostrarlo como si
        // siguiera en curso: evita que reaparezca con su startTime original
        // y genere un segundo registro con una duración disparatada al
        // volver a pararlo.
        if (remoteActive && localStorage.getItem(ACTIVE_WORKOUT_DELETE_PENDING_KEY)) {
          const cleared = await deleteActiveWorkoutWithRetry(2);
          if (cleared) remoteActive = null;
        }
        const { INITIAL_EXERCISES } = exercisesModule;

        // Exercises: sync with INITIAL_EXERCISES
        if (remoteEx && remoteEx.length > 0) {
          const parsedIds = new Set(remoteEx.map((e: any) => e.id));
          const missing = INITIAL_EXERCISES.filter((e) => !parsedIds.has(e.id));
          const updated = remoteEx.map((e: any) => {
            const initialMatch = INITIAL_EXERCISES.find((ie) => ie.id === e.id);
            if (initialMatch && !e.isCustom) {
              // Un ejercicio de fábrica guardado en el servidor se refresca entero
              // con el catálogo (nombre, medios, grupo, zona, tipo...).
              return { ...e, ...initialMatch };
            }
            return e;
          });
          const combined = [...updated, ...missing];
          setExercises(combined);
        } else {
          setExercises(INITIAL_EXERCISES);
        }

        // Routines: respeta arrays vacíos del servidor
        if (remoteRout !== null && remoteRout !== undefined) {
          const loaded = remapWorkoutList<Routine>(remoteRout);
          routinesBase.current = new Map(loaded.map((r) => [r.id, r]));
          setRoutines(loaded);
        } else {
          setRoutines(DEFAULT_ROUTINES);
        }

        // Logs: respeta arrays vacíos del servidor
        if (remoteLogs !== null && remoteLogs !== undefined) {
          const loaded = remapWorkoutList<WorkoutLog>(remoteLogs);
          logsBase.current = new Map(loaded.map((l) => [l.id, l]));
          setLogs(loaded);
        } else {
          setLogs(DEFAULT_LOGS);
        }

        // Active Workout
        if (remoteActive) {
          setActiveWorkout(remapActiveWorkout(remoteActive));
        }
      } catch (err) {
        // Fallback to localStorage if API unavailable
        console.warn('API unavailable, using localStorage fallback', err);

        const { INITIAL_EXERCISES } = await exercisesModulePromise;

        const savedEx = localStorage.getItem('hevy_exercises');
        if (savedEx) {
          try {
            const parsed = JSON.parse(savedEx);
            const parsedIds = new Set(parsed.map((e: any) => e.id));
            const missing = INITIAL_EXERCISES.filter((e) => !parsedIds.has(e.id));
            const updated = parsed.map((e: any) => {
              const initialMatch = INITIAL_EXERCISES.find((ie) => ie.id === e.id);
              if (initialMatch && !e.isCustom) {
                return { ...e, ...initialMatch };
              }
              return e;
            });
            const combined = [...updated, ...missing];
            setExercises(combined);
          } catch {
            setExercises(INITIAL_EXERCISES);
          }
        } else {
          setExercises(INITIAL_EXERCISES);
        }

        const savedRout = localStorage.getItem('hevy_routines');
        try {
          const parsed = savedRout ? JSON.parse(savedRout) : null;
          setRoutines(parsed !== null ? remapWorkoutList(parsed) : DEFAULT_ROUTINES);
        } catch {
          setRoutines(DEFAULT_ROUTINES);
        }

        const savedLogs = localStorage.getItem('hevy_logs');
        try {
          const parsed = savedLogs ? JSON.parse(savedLogs) : null;
          setLogs(parsed !== null ? remapWorkoutList(parsed) : DEFAULT_LOGS);
        } catch {
          setLogs(DEFAULT_LOGS);
        }

        const savedActive = localStorage.getItem('hevy_active_workout');
        if (savedActive) {
          setActiveWorkout(remapActiveWorkout(JSON.parse(savedActive)));
        }
      }
    };

    loadData();
  }, []);

  // 2. Synchronizers
  // Solo guardamos en el servidor los ejercicios PERSONALIZADOS. Los 873 de fábrica
  // vienen del bundle (INITIAL_EXERCISES) y se combinan al cargar, así evitamos
  // subir megabytes de datos en cada cambio.
  const saveExercises = async (newEx: Exercise[]) => {
    setExercises(newEx);
    const customOnly = newEx.filter((e) => e.isCustom);
    try {
      if (customOnly.length > 0) {
        await api.saveExercises(customOnly);
      }
      localStorage.setItem('hevy_exercises', JSON.stringify(customOnly));
    } catch (err) {
      console.error('Error saving exercises to API, using localStorage fallback', err);
      localStorage.setItem('hevy_exercises', JSON.stringify(customOnly));
    }
  };

  const saveRoutines = async (newRout: Routine[]) => {
    const previousRoutines = routines;
    setRoutines(newRout);
    try {
      const prevById = new Map(previousRoutines.map((r) => [r.id, r]));
      const newIds = new Set(newRout.map((r) => r.id));

      // Elimina en el servidor las rutinas que ya no están
      const removedIds = previousRoutines.filter((r) => !newIds.has(r.id)).map((r) => r.id);
      // Guarda solo las nuevas o modificadas (evita re-subir toda la lista)
      const changed = newRout.filter((r) => {
        const prev = prevById.get(r.id);
        return !prev || JSON.stringify(prev) !== JSON.stringify(r);
      });

      // Si otro dispositivo editó la misma rutina desde que la cargué, se fusionan
      // los cambios campo a campo en vez de pisar los suyos.
      let toSave = changed;
      let finalRout = newRout;
      try {
        const remoteById = new Map(remapWorkoutList(await api.getRoutines()).map((r) => [r.id, r]));
        const merged = changed.map((r) => mergeRecord(routinesBase.current.get(r.id), r, remoteById.get(r.id)));
        if (merged.some((m, i) => !deepEqual(m, changed[i]))) {
          const mergedById = new Map(merged.map((r) => [r.id, r]));
          toSave = merged;
          finalRout = newRout.map((r) => mergedById.get(r.id) ?? r);
          setRoutines((cur) => cur.map((r) => mergedById.get(r.id) ?? r));
        }
      } catch {
        // Sin conexión con el servidor: se guarda tal cual, como siempre.
      }

      await Promise.all([
        ...removedIds.map((id) => api.deleteRoutine(id)),
        ...toSave.map((r) => api.saveRoutine(r)),
      ]);
      removedIds.forEach((id) => routinesBase.current.delete(id));
      toSave.forEach((r) => routinesBase.current.set(r.id, r));

      if (finalRout.length === 0) {
        localStorage.removeItem('hevy_routines');
      } else {
        localStorage.setItem('hevy_routines', JSON.stringify(finalRout));
      }
    } catch (err) {
      console.error('Error saving routines to API, using localStorage fallback', err);
      localStorage.setItem('hevy_routines', JSON.stringify(newRout));
    }
  };

  const saveLogs = async (newLogs: WorkoutLog[]) => {
    const previousLogs = logs;
    setLogs(newLogs);
    try {
      const prevById = new Map(previousLogs.map((l) => [l.id, l]));
      const newIds = new Set(newLogs.map((l) => l.id));

      // Elimina en el servidor los logs que ya no están
      const removedIds = previousLogs.filter((l) => !newIds.has(l.id)).map((l) => l.id);
      // Guarda solo los nuevos o modificados (no re-sube todo el historial)
      const changed = newLogs.filter((l) => {
        const prev = prevById.get(l.id);
        return !prev || JSON.stringify(prev) !== JSON.stringify(l);
      });

      // Mismo criterio que con las rutinas: un entrenamiento editado a la vez en
      // dos dispositivos se fusiona campo a campo (solo si ya existía antes).
      let toSave = changed;
      let finalLogs = newLogs;
      if (changed.some((l) => logsBase.current.has(l.id))) {
        try {
          const remoteById = new Map(remapWorkoutList(await api.getLogs()).map((l) => [l.id, l]));
          const merged = changed.map((l) => mergeRecord(logsBase.current.get(l.id), l, remoteById.get(l.id)));
          if (merged.some((m, i) => !deepEqual(m, changed[i]))) {
            const mergedById = new Map(merged.map((l) => [l.id, l]));
            toSave = merged;
            finalLogs = newLogs.map((l) => mergedById.get(l.id) ?? l);
            setLogs((cur) => cur.map((l) => mergedById.get(l.id) ?? l));
          }
        } catch {
          // Sin conexión con el servidor: se guarda tal cual.
        }
      }

      await Promise.all([
        ...removedIds.map((id) => api.deleteLog(id)),
        ...toSave.map((l) => api.saveLog(l)),
      ]);
      removedIds.forEach((id) => logsBase.current.delete(id));
      toSave.forEach((l) => logsBase.current.set(l.id, l));

      if (finalLogs.length === 0) {
        localStorage.removeItem('hevy_logs');
      } else {
        localStorage.setItem('hevy_logs', JSON.stringify(finalLogs));
      }
    } catch (err) {
      console.error('Error saving logs to API, using localStorage fallback', err);
      localStorage.setItem('hevy_logs', JSON.stringify(newLogs));
    }
  };

  // Al volver a la app (o a la pestaña) se traen los cambios hechos en otros
  // dispositivos y se fusionan con lo local, sin pisar nada ni guardar de nuevo.
  useEffect(() => {
    let lastPull = Date.now();
    const pull = async () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastPull < 60000) return;
      lastPull = Date.now();
      try {
        const [rr, ll] = await Promise.all([api.getRoutines(), api.getLogs()]);
        const theirsR = remapWorkoutList(rr);
        const theirsL = remapWorkoutList(ll);
        const baseR = [...routinesBase.current.values()];
        const baseL = [...logsBase.current.values()];
        setRoutines((cur) => {
          const merged = mergeCollection(baseR, cur, theirsR);
          return deepEqual(merged, cur) ? cur : merged;
        });
        setLogs((cur) => {
          const merged = mergeCollection(baseL, cur, theirsL);
          return deepEqual(merged, cur) ? cur : merged;
        });
        routinesBase.current = new Map(theirsR.map((r) => [r.id, r]));
        logsBase.current = new Map(theirsL.map((l) => [l.id, l]));
      } catch {
        // Sin conexión: no pasa nada, se reintentará la próxima vez.
      }
    };
    document.addEventListener('visibilitychange', pull);
    window.addEventListener('focus', pull);
    return () => {
      document.removeEventListener('visibilitychange', pull);
      window.removeEventListener('focus', pull);
    };
  }, []);

  // Reglas de progresión: se guardan primero en el servidor y solo si va bien
  // se actualiza la pantalla (si falla, el panel muestra el error).
  const handleSaveProgressionRule = async (rule: ProgressionRule) => {
    await api.saveProgressionRule(rule);
    setProgressionRules((prev) => [...prev.filter((r) => r.exerciseId !== rule.exerciseId), rule]);
  };

  const handleDeleteProgressionRule = async (exerciseId: string) => {
    await api.deleteProgressionRule(exerciseId);
    setProgressionRules((prev) => prev.filter((r) => r.exerciseId !== exerciseId));
  };

  return {
    handleSaveProgressionRule, handleDeleteProgressionRule,
    exercises, setExercises,
    routines, setRoutines,
    logs, setLogs,
    progressionRules, setProgressionRules,
    exerciseMedia, setExerciseMedia,
    exerciseOnlyMedia, workoutPhotos, progressPhotos, displayExercises, existingLogIds,
    saveExercises, saveRoutines, saveLogs,
    ...activeStore,
  };
}
