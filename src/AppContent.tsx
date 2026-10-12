import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dumbbell,
  ClipboardList,
  TrendingUp,
  Images,
  Search,
  Plus,
  Play,
  Check,
  Clock,
  History,
  ArrowRight,
  Download,
  Upload,
  X,
  Award,
  ChevronRight,
  Sparkles,
  Calendar,
  Trophy,
  Shuffle,
  Users,
  LogOut,
  Share2
} from 'lucide-react';

import { Exercise, Routine, WorkoutLog, WorkoutExercise, WorkoutSet } from './types';
import { MUSCLE_GROUPS, EQUIPMENT_TYPES, getMuscleColor } from './data/exerciseMeta';
import { DEFAULT_ROUTINES, DEFAULT_LOGS } from './data/seed';
import * as api from './api/client';
import { computeSessionRecords, formatRecordsMessage } from './utils/records';
import { formatEsNumber } from './utils/number';
import { getLastPerformanceSets } from './utils/lastPerformance';
import { ProgressionRule, prefillWithProgression } from './utils/progressionRules';
import ImportPanel, { ImportOutcome } from './components/ImportPanel';
import PasskeySection from './components/PasskeySection';
import { prepareMediaUpload } from './utils/mediaUpload';
import WorkoutPhotos from './components/WorkoutPhotos';
import { activeWorkoutPhotoKey, localDay } from './utils/photoTools';
import { detectSessionPRs, formatPRRecord, getPREmoji } from './utils/prDetection';
import {
  detectMuscleZone,
  MuscleZone,
  MUSCLE_GROUP_ZONES,
  MUSCLE_ZONE_IMAGE,
  MUSCLE_ZONE_LABEL,
} from './utils/muscleZone';

import ExerciseLibraryPanel from './components/ExerciseLibraryPanel';
import ActiveWorkoutPanel from './components/ActiveWorkoutPanel';
import WorkoutShareModal from './components/WorkoutShareModal';
import PlateCalculatorModal from './components/PlateCalculatorModal';
import ConfirmDialog from './components/ConfirmDialog';
import { AuthUser } from './auth';
import LegalFooterLinks from './components/legal/LegalFooterLinks';

// Cargados de forma diferida: no se necesitan hasta que el usuario visita esa
// pestaña en concreto (Progreso arrastra además la librería de gráficos, que
// así deja de formar parte de la carga inicial).
const RoutinesPanel = lazy(() => import('./components/RoutinesPanel'));
const ProgressPanel = lazy(() => import('./components/ProgressPanel'));
const UserManagementPanel = lazy(() => import('./components/UserManagementPanel'));
const PhotosPanel = lazy(() => import('./components/PhotosPanel'));

function TabLoadingFallback() {
  return <div className="p-10 text-center text-slate-500 text-sm">Cargando…</div>;
}

interface AppContentProps {
  currentUser: AuthUser;
  onLogout: () => void;
}

// Marca persistente: se activa cuando el borrado del active_workout en el
// servidor falla incluso tras reintentar (ver deleteActiveWorkoutWithRetry).
// Se comprueba al arrancar la app para intentar limpiarlo antes de mostrar
// como "activo" un entrenamiento que en realidad ya se dio por finalizado.
const ACTIVE_WORKOUT_DELETE_PENDING_KEY = 'hevy_active_workout_delete_pending';

export default function AppContent({ currentUser, onLogout }: AppContentProps) {
  const [currentTab, setCurrentTab] = useState<'train' | 'routines' | 'exercises' | 'progress' | 'photos' | 'users'>('train');

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
    if (primaryByExercise.size === 0) return exercises;
    return exercises.map((e) => (primaryByExercise.has(e.id) ? { ...e, imageUrl: primaryByExercise.get(e.id)! } : e));
  }, [exercises, exerciseOnlyMedia]);
  const [activeWorkout, setActiveWorkout] = useState<{
    routineId?: string;
    routineName: string;
    startTime: string;
    exercises: WorkoutExercise[];
  } | null>(null);

  // Celebration overlay state
  const [justFinishedWorkout, setJustFinishedWorkout] = useState<WorkoutLog | null>(null);
  const [workoutShareOpen, setWorkoutShareOpen] = useState(false);
  const [recordsMessage, setRecordsMessage] = useState<string | null>(null);
  const [showRandomWorkoutModal, setShowRandomWorkoutModal] = useState(false);

  // --- Filtros del entrenamiento aleatorio (todos multiselección; vacío = todos) ---
  const [randomGroups, setRandomGroups] = useState<string[]>([]);
  const [randomZones, setRandomZones] = useState<MuscleZone[]>([]);
  const [randomEquipment, setRandomEquipment] = useState<string[]>([]);
  const [randomCount, setRandomCount] = useState(5);

  const toggleRandomEquipment = (eq: string) => {
    setRandomEquipment((prev) => (prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]));
  };
  const toggleRandomZone = (z: MuscleZone) => {
    setRandomZones((prev) => (prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z]));
  };
  const toggleRandomGroup = (g: string) => {
    const next = randomGroups.includes(g)
      ? randomGroups.filter((x) => x !== g)
      : [...randomGroups, g];
    setRandomGroups(next);
    // Al quitar un grupo, se descartan las zonas que ya no pertenecen a ningún
    // grupo seleccionado (si no queda ninguno, vuelven a estar todas disponibles).
    if (next.length > 0) {
      const allowed = new Set(
        next.flatMap((gg) => MUSCLE_GROUP_ZONES[gg as Exercise['muscleGroup']] ?? [])
      );
      setRandomZones((zones) => zones.filter((z) => allowed.has(z)));
    }
  };
  const clearRandomFilters = () => {
    setRandomGroups([]);
    setRandomZones([]);
    setRandomEquipment([]);
  };

  // Zona muscular de cada ejercicio, calculada una sola vez
  const zoneByExerciseId = useMemo(() => {
    const map = new Map<string, MuscleZone>();
    exercises.forEach((e) => map.set(e.id, detectMuscleZone(e)));
    return map;
  }, [exercises]);

  // Zonas ofrecidas: las de los grupos marcados, o las 18 si no hay ninguno.
  // Se recorre MUSCLE_GROUPS para mantener siempre el mismo orden anatómico.
  const availableRandomZones = useMemo<MuscleZone[]>(() => {
    const groups = randomGroups.length > 0 ? randomGroups : [...MUSCLE_GROUPS];
    return MUSCLE_GROUPS.filter((g) => groups.includes(g)).flatMap(
      (g) => MUSCLE_GROUP_ZONES[g as Exercise['muscleGroup']] ?? []
    );
  }, [randomGroups]);

  // Ejercicios que cumplen TODOS los filtros activos
  const randomPool = useMemo(
    () =>
      exercises.filter(
        (e) =>
          (randomGroups.length === 0 || randomGroups.includes(e.muscleGroup)) &&
          (randomZones.length === 0 || randomZones.includes(zoneByExerciseId.get(e.id)!)) &&
          (randomEquipment.length === 0 || randomEquipment.includes(e.equipment))
      ),
    [exercises, randomGroups, randomZones, randomEquipment, zoneByExerciseId]
  );
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupJson, setBackupJson] = useState('');

  // Plate Math Modal
  const [showPlateCalculator, setShowPlateCalculator] = useState(false);

  // Custom confirmation state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // 1. Initial mounting loaders
  useEffect(() => {
    const loadData = async () => {
      // El catálogo de 873 ejercicios (~1.1MB) se carga en paralelo con las
      // llamadas a la API, como chunk aparte, en vez de venir en el bundle
      // inicial (así el login y el primer render no esperan por él).
      const exercisesModulePromise = import('./data/exercises');

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
        setProgressionRules(Array.isArray(remoteRules) ? remoteRules : []);
        api
          .getMyMedia()
          .then((items) => setExerciseMedia(Array.isArray(items) ? items : []))
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
              return {
                ...e,
                name: initialMatch.name,
                imageUrl: initialMatch.imageUrl,
                instructions: initialMatch.instructions,
                defaultRestTime: initialMatch.defaultRestTime,
              };
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
          setRoutines(remoteRout);
        } else {
          setRoutines(DEFAULT_ROUTINES);
        }

        // Logs: respeta arrays vacíos del servidor
        if (remoteLogs !== null && remoteLogs !== undefined) {
          setLogs(remoteLogs);
        } else {
          setLogs(DEFAULT_LOGS);
        }

        // Active Workout
        if (remoteActive) {
          setActiveWorkout(remoteActive);
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
                return {
                  ...e,
                  name: initialMatch.name,
                  imageUrl: initialMatch.imageUrl,
                  instructions: initialMatch.instructions,
                  defaultRestTime: initialMatch.defaultRestTime,
                };
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
          setRoutines(parsed !== null ? parsed : DEFAULT_ROUTINES);
        } catch {
          setRoutines(DEFAULT_ROUTINES);
        }

        const savedLogs = localStorage.getItem('hevy_logs');
        try {
          const parsed = savedLogs ? JSON.parse(savedLogs) : null;
          setLogs(parsed !== null ? parsed : DEFAULT_LOGS);
        } catch {
          setLogs(DEFAULT_LOGS);
        }

        const savedActive = localStorage.getItem('hevy_active_workout');
        if (savedActive) {
          setActiveWorkout(JSON.parse(savedActive));
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

      await Promise.all([
        ...removedIds.map((id) => api.deleteRoutine(id)),
        ...changed.map((r) => api.saveRoutine(r)),
      ]);

      if (newRout.length === 0) {
        localStorage.removeItem('hevy_routines');
      } else {
        localStorage.setItem('hevy_routines', JSON.stringify(newRout));
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

      await Promise.all([
        ...removedIds.map((id) => api.deleteLog(id)),
        ...changed.map((l) => api.saveLog(l)),
      ]);

      if (newLogs.length === 0) {
        localStorage.removeItem('hevy_logs');
      } else {
        localStorage.setItem('hevy_logs', JSON.stringify(newLogs));
      }
    } catch (err) {
      console.error('Error saving logs to API, using localStorage fallback', err);
      localStorage.setItem('hevy_logs', JSON.stringify(newLogs));
    }
  };

  // El entrenamiento activo se guarda con "debounce": la UI se actualiza al
  // instante pero la escritura en el servidor se agrupa (evita 1 POST por tecla
  // y las condiciones de carrera por respuestas fuera de orden).
  const activeWorkoutSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Al finalizar/cancelar un entrenamiento hay que borrar su active_workout
  // en el servidor. Si esa llamada falla (red inestable, app en segundo
  // plano, móvil bloqueándose a media petición...) el entrenamiento queda
  // "zombie" en el servidor con su startTime original: la próxima vez que se
  // abra la app se mostrará como si siguiera activo, y al pararlo se genera
  // un segundo registro con una duración disparatada (desde aquel startTime
  // hasta ahora). Para evitarlo: reintentamos varias veces con espera
  // creciente, y si aun así falla, dejamos una marca en localStorage para
  // volver a intentarlo en cuanto la app arranque de nuevo, ANTES de confiar
  // en lo que devuelva el servidor sobre si hay un entrenamiento activo.
  const deleteActiveWorkoutWithRetry = async (maxAttempts = 3): Promise<boolean> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        await api.deleteActiveWorkout();
        localStorage.removeItem(ACTIVE_WORKOUT_DELETE_PENDING_KEY);
        localStorage.removeItem('hevy_active_workout');
        return true;
      } catch (err) {
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
        } else {
          console.error(
            'No se pudo confirmar el borrado del entrenamiento activo en el servidor tras varios intentos; se reintentará al volver a abrir la app.',
            err
          );
          localStorage.setItem(ACTIVE_WORKOUT_DELETE_PENDING_KEY, '1');
        }
      }
    }
    return false;
  };

  const saveActiveWorkoutState = (state: typeof activeWorkout) => {
    setActiveWorkout(state);

    if (activeWorkoutSaveTimer.current) {
      clearTimeout(activeWorkoutSaveTimer.current);
      activeWorkoutSaveTimer.current = null;
    }

    // Finalizar/cancelar (state=null) o iniciar: guardar de inmediato
    if (state === null) {
      deleteActiveWorkoutWithRetry();
      return;
    }

    // Actualizaciones durante el entrenamiento: agrupar en 800ms
    activeWorkoutSaveTimer.current = setTimeout(() => {
      api.saveActiveWorkout(state).catch((err) => {
        console.error('Error saving active workout, using localStorage fallback', err);
        localStorage.setItem('hevy_active_workout', JSON.stringify(state));
      });
    }, 800);
  };

  // --- ACTIONS ---

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
        { id: `set-random-${Date.now()}-${idx}-1`, weight: 0, reps: 10, completed: false },
        { id: `set-random-${Date.now()}-${idx}-2`, weight: 0, reps: 10, completed: false },
        { id: `set-random-${Date.now()}-${idx}-3`, weight: 0, reps: 10, completed: false },
      ];
      return {
        id: `we-random-${Date.now()}-${idx}`,
        exerciseId: ex.id,
        restTime: ex.defaultRestTime,
        // Igual que en las rutinas: si ya se entrenó antes, viene prerrellenado
        sets: prefillWithProgression(
          baseSets,
          getLastPerformanceSets(ex.id, logs),
          progressionRules.find((r) => r.exerciseId === ex.id)
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
    setShowRandomWorkoutModal(false);
  };

  // Start workout from a routine
  const handleStartRoutine = (routine: Routine) => {
    if (activeWorkout) {
      alert('Ya tienes un entrenamiento activo. Finalízalo o cancélalo antes de iniciar uno nuevo.');
      return;
    }

    // Map routine exercises to fresh active copies. Los pesos y repeticiones se
    // prerrellenan con lo que se hizo la ÚLTIMA vez con ese ejercicio, así la
    // mayoría de los días no hay que reescribirlos: se arranca con los valores
    // anteriores ya puestos en los campos y solo se ajusta lo que cambie.
    // Si el ejercicio tiene una regla de progresión activa, en vez de repetir
    // la última vez se parte de lo que toca según la regla.
    const rulesByExercise = new Map(progressionRules.map((r) => [r.exerciseId, r]));
    const activeExercises: WorkoutExercise[] = routine.exercises.map((re) => {
      const lastSets = getLastPerformanceSets(re.exerciseId, logs);
      const baseSets = re.sets.map((s, idx) => ({
        id: `set-active-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
        weight: s.weight,
        reps: s.reps,
        completed: false, // Reset completion checklist
        // Tipos de serie definidos en la rutina (calentamiento, drop set…)
        ...(s.isWarmup ? { isWarmup: true } : {}),
        ...(s.setType ? { setType: s.setType } : {}),
      }));
      return {
        id: `we-active-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        exerciseId: re.exerciseId,
        restTime: re.restTime,
        ...(re.supersetId ? { supersetId: re.supersetId } : {}),
        sets: prefillWithProgression(baseSets, lastSets, rulesByExercise.get(re.exerciseId)),
      };
    });

    const freshWorkout = {
      routineId: routine.id,
      routineName: routine.name,
      startTime: new Date().toISOString(),
      exercises: activeExercises,
    };

    saveActiveWorkoutState(freshWorkout);
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
    setRecordsMessage(formatRecordsMessage(summary));

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
      setRecordsMessage(fullMessage);
    }

    // Trigger celebration modal and navigate to progress tab
    setJustFinishedWorkout(newLog);
    setCurrentTab('progress');
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
      sets: we.sets.map((s) => ({ id: s.id, weight: s.weight, reps: s.reps, completed: false })),
    }));

  // Si el entrenamiento se inició desde una rutina y, durante la sesión, se
  // añadieron/quitaron ejercicios o series respecto a esa rutina, pregunta
  // si se quiere guardar esos cambios como la nueva plantilla o mantener la
  // rutina original. En cualquier caso, el entrenamiento se finaliza igual.
  const finishConsideringRoutineChanges = (durationSeconds: number, loggedExercises: WorkoutExercise[]) => {
    const workout = activeWorkout;
    const sourceRoutine = workout?.routineId ? routines.find((r) => r.id === workout.routineId) : null;

    if (workout && sourceRoutine) {
      const changed =
        getWorkoutStructureSignature(workout.exercises) !== getWorkoutStructureSignature(sourceRoutine.exercises);

      if (changed) {
        setConfirmConfig({
          isOpen: true,
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
      setConfirmConfig({
        isOpen: true,
        title: 'Finalizar Entrenamiento Vacío',
        message: 'No has marcado ninguna serie como completada en este entrenamiento. ¿Deseas finalizarlo de todos modos?',
        confirmText: 'Sí, finalizar',
        type: 'warning',
        onConfirm: () => {
          // setTimeout: deja que este diálogo termine de cerrarse antes de
          // posiblemente abrir el de "rutina modificada" a continuación
          // (encadenar dos setConfirmConfig en el mismo tick pisaría el segundo).
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

  // Edit/Create Routine
  const handleSaveRoutine = (routine: Routine) => {
    const exists = routines.some((r) => r.id === routine.id);
    let updated;
    if (exists) {
      updated = routines.map((r) => (r.id === routine.id ? routine : r));
    } else {
      updated = [routine, ...routines];
    }
    saveRoutines(updated);
  };

  // Reordenar carpetas/rutinas: recibe las rutinas cuya posición cambió
  // (folderOrder y/o sortOrder) y las fusiona con el resto sin tocarlas.
  const handleReorderRoutines = (updatedRoutines: Routine[]) => {
    const updatedById = new Map(updatedRoutines.map((r) => [r.id, r]));
    const merged = routines.map((r) => updatedById.get(r.id) ?? r);
    saveRoutines(merged);
  };

  // Borrado en bloque, sin diálogo propio: lo usa el panel de rutinas al
  // eliminar una carpeta entera (ya confirma él, y así no se encadenan N
  // confirmaciones seguidas, una por rutina).
  const handleDeleteRoutines = (routineIds: string[]) => {
    const ids = new Set(routineIds);
    saveRoutines(routines.filter((r) => !ids.has(r.id)));
  };

  const handleDeleteRoutine = (routineId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar Rutina',
      message: '¿Estás seguro de que deseas eliminar esta rutina de forma permanente?',
      confirmText: 'Eliminar',
      type: 'danger',
      onConfirm: () => {
        const updated = routines.filter((r) => r.id !== routineId);
        saveRoutines(updated);
      },
    });
  };

  const handleAddCustomExercise = (ex: Exercise) => {
    const updated = [ex, ...exercises];
    saveExercises(updated);
  };

  // Delete historical workout log
  const handleDeleteLog = (logId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar Registro de Historial',
      message: '¿Seguro que deseas eliminar este registro de entrenamiento de tu historial?',
      confirmText: 'Eliminar',
      type: 'danger',
      onConfirm: () => {
        const updated = logs.filter((l) => l.id !== logId);
        saveLogs(updated);
      },
    });
  };

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

  // Importación desde otra app (Hevy, Strong, FitNotes). Los registros se suben
  // de uno en uno (no en paralelo) para no saturar el servidor con cientos de
  // escrituras a la vez en SQLite; solo se añaden al historial los que el
  // servidor confirma.
  const handleImportWorkouts = async (
    newLogs: WorkoutLog[],
    newExercises: Exercise[],
    onProgress: (done: number, total: number) => void
  ): Promise<ImportOutcome> => {
    if (newExercises.length > 0) {
      const updatedExercises = [...newExercises, ...exercises];
      const customOnly = updatedExercises.filter((e) => e.isCustom);
      await api.saveExercises(customOnly);
      setExercises(updatedExercises);
      localStorage.setItem('hevy_exercises', JSON.stringify(customOnly));
    }

    const saved: WorkoutLog[] = [];
    let failed = 0;
    for (let i = 0; i < newLogs.length; i++) {
      try {
        await api.saveLog(newLogs[i]);
        saved.push(newLogs[i]);
      } catch {
        failed++;
      }
      onProgress(i + 1, newLogs.length);
    }

    if (saved.length > 0) {
      setLogs((prev) => {
        const prevIds = new Set(prev.map((l) => l.id));
        const merged = [...saved.filter((l) => !prevIds.has(l.id)), ...prev].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        localStorage.setItem('hevy_logs', JSON.stringify(merged));
        return merged;
      });
    }

    return { saved: saved.length, failed };
  };

  // --- BACKUP & RESTORE ACTIONS ---
  const handleExportData = () => {
    const backupData = {
      routines,
      logs,
      exercises: exercises.filter(e => e.isCustom) // only backup custom ones
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hevy_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(backupJson);
      if (parsed.routines && Array.isArray(parsed.routines)) {
        const mergedRoutines = [...parsed.routines, ...routines.filter(r => !parsed.routines.some((pr: any) => pr.id === r.id))];
        saveRoutines(mergedRoutines);
      }
      if (parsed.logs && Array.isArray(parsed.logs)) {
        const mergedLogs = [...parsed.logs, ...logs.filter(l => !parsed.logs.some((pl: any) => pl.id === l.id))];
        saveLogs(mergedLogs);
      }
      if (parsed.exercises && Array.isArray(parsed.exercises)) {
        const mergedExercises = [...exercises, ...parsed.exercises.filter((pe: any) => !exercises.some(e => e.id === pe.id))];
        saveExercises(mergedExercises);
      }
      alert('¡Copia de seguridad restaurada correctamente!');
      setShowBackupModal(false);
      setBackupJson('');
    } catch (err) {
      alert('Error al restaurar los datos. Por favor, asegúrate de que el formato JSON es válido.');
    }
  };

  // Last workout summary loader
  const lastWorkout = logs[0];

  return (
    <div id="hevy-app-container" className="min-h-dvh bg-slate-950 text-slate-200 flex flex-col pb-[calc(6rem+env(safe-area-inset-bottom))] font-sans">
      {/* 1. TOP HEADER NAVIGATION BAR (con espacio para el notch/isla dinámica de iOS) */}
      <header className="bg-slate-900 border-b border-slate-800 shadow-xl sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* Logo brand */}
          <div className="flex items-center gap-2.5">
            <img src="/icon-192.png" alt="KookyeCatGym" className="h-9 w-9 rounded-lg shadow-lg shadow-blue-500/20" />
            <div className="text-left flex items-center gap-1.5">
              <span className="font-black text-white tracking-tight text-lg">KookyeCatGym</span>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30">
                Beta
              </span>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1.5">
            {[
              { id: 'train', label: 'Entrenar', icon: Play },
              { id: 'routines', label: 'Rutinas', icon: ClipboardList },
              { id: 'exercises', label: 'Ejercicios', icon: Dumbbell },
              { id: 'progress', label: 'Progreso', icon: TrendingUp },
              { id: 'photos', label: 'Fotos', icon: Images },
              ...(currentUser.role === 'admin' ? [{ id: 'users', label: 'Usuarios', icon: Users }] : []),
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                    currentTab === tab.id
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                      : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Backup dropdown / Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBackupModal(true)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold border border-slate-800"
              title="Copia de Seguridad"
            >
              <Upload className="h-4 w-4 text-blue-400" />
              <span className="hidden sm:inline">Copia de Seg.</span>
            </button>
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold border border-slate-800"
              title={`Cerrar sesión (${currentUser.username})`}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. BODY CONTENT PANEL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {currentTab === 'train' && (
            <motion.div
              key="train-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
              {/* Train Welcome banner */}
              <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border border-slate-800">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-12 translate-x-12" />

                <div className="space-y-3 z-10">
                  <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-500/20">
                    Entrenamientos Inteligentes
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white">
                    ¡Bienvenido de vuelta, Guerrero!
                  </h1>
                  <p className="text-slate-300 text-sm max-w-lg">
                    Inicia un entrenamiento vacío para añadir ejercicios libremente sobre la marcha, o selecciona una de tus rutinas estructuradas.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 z-10 w-full md:w-auto">
                  <button
                    id="btn-start-empty-workout"
                    onClick={handleStartFreeWorkout}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    Entrenamiento Libre
                  </button>
                  <button
                    onClick={() => setCurrentTab('routines')}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-2xl text-sm font-bold transition-all cursor-pointer"
                  >
                    <ClipboardList className="h-4.5 w-4.5 text-blue-400" />
                    Iniciar una Rutina
                  </button>
                  <button
                    id="btn-start-random-workout"
                    onClick={() => setShowRandomWorkoutModal(true)}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-2xl text-sm font-bold transition-all cursor-pointer"
                  >
                    <Shuffle className="h-4.5 w-4.5 text-blue-400" />
                    Entrenamiento Aleatorio
                  </button>
                </div>
              </div>

              {/* Quick Resume Card of last Workout */}
              {lastWorkout && (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-left">
                    <div className="p-3 bg-blue-950/40 text-blue-400 rounded-2xl border border-blue-500/20">
                      <Award className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Último Entrenamiento Registrado</div>
                      <h4 className="font-bold text-slate-200 text-sm">{lastWorkout.routineName}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(lastWorkout.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} • {Math.round(lastWorkout.duration / 60)} min
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentTab('progress')}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    Ver en Gráficos <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Training History List log */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                  <History className="h-5 w-5 text-blue-400" />
                  <h3 className="font-extrabold text-slate-200 text-base">Historial Reciente de Entrenamientos ({logs.length})</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      id={`log-card-${log.id}`}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 relative overflow-hidden group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-slate-100 leading-snug">{log.routineName}</h4>
                          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3 text-blue-400" />
                            {new Date(log.date).toLocaleString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Eliminar del historial"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-slate-950/50 p-3 rounded-xl text-center text-xs border border-slate-800/60">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Duración</span>
                          <span className="font-bold text-slate-200">{Math.round(log.duration / 60)} min</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ejercicios</span>
                          <span className="font-bold text-slate-200">{log.exercises.length}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Series Totales</span>
                          <span className="font-bold text-slate-200">
                            {log.exercises.reduce((sum, item) => sum + item.sets.filter(s => s.completed).length, 0)}
                          </span>
                        </div>
                      </div>

                      {/* Exercises logged dropdown list */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                        {log.exercises.map((item) => {
                          const ex = exercises.find((e) => e.id === item.exerciseId);
                          const maxWeight = item.sets.length > 0 ? Math.max(...item.sets.map((s) => s.weight)) : 0;
                          const totalReps = item.sets.reduce((sum, s) => sum + s.reps, 0);

                          return (
                            <div key={item.id} className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-300 truncate max-w-[180px]">
                                {ex ? ex.name : 'Ejercicio'}
                              </span>
                              <span className="text-slate-400 font-medium">
                                {item.sets.length} series × {formatEsNumber(maxWeight)}kg • {totalReps} reps
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Fotos del entrenamiento: se pueden añadir en cualquier momento */}
                      <div className="pt-3 border-t border-slate-800/60">
                        <WorkoutPhotos
                          title={log.routineName}
                          photos={workoutPhotos.filter((p) => p.logId === log.id)}
                          onUpload={(file, onProgress) => handleUploadWorkoutPhoto(log.id, file, onProgress)}
                          onDelete={handleDeleteMedia}
                        />
                      </div>
                    </div>
                  ))}

                  {logs.length === 0 && (
                    <div className="col-span-full bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 p-12 text-center">
                      <History className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">Historial vacío</p>
                      <p className="text-slate-500 text-xs mt-1">Tus entrenamientos completados se guardarán aquí.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentTab === 'routines' && (
            <motion.div
              key="routines-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Suspense fallback={<TabLoadingFallback />}>
                <RoutinesPanel
                  routines={routines}
                  exercises={displayExercises}
                  onStartRoutine={handleStartRoutine}
                  onSaveRoutine={handleSaveRoutine}
                  onDeleteRoutine={handleDeleteRoutine}
                  onDeleteRoutines={handleDeleteRoutines}
                  onReorderRoutines={handleReorderRoutines}
                />
              </Suspense>
            </motion.div>
          )}

          {currentTab === 'exercises' && (
            <motion.div
              key="exercises-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ExerciseLibraryPanel
                exercises={displayExercises}
                onAddCustomExercise={handleAddCustomExercise}
                media={exerciseOnlyMedia}
                onUploadMedia={handleUploadMedia}
                onDeleteMedia={handleDeleteMedia}
                onSetPrimaryMedia={handleSetPrimaryMedia}
              />
            </motion.div>
          )}

          {currentTab === 'progress' && (
            <motion.div
              key="progress-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Suspense fallback={<TabLoadingFallback />}>
                <ProgressPanel
                  logs={logs}
                  exercises={exercises}
                  progressionRules={progressionRules}
                  onSaveProgressionRule={handleSaveProgressionRule}
                  onDeleteProgressionRule={handleDeleteProgressionRule}
                  progressPhotos={progressPhotos}
                  onUploadProgressPhoto={handleUploadProgressPhoto}
                  onUpdatePhoto={handleUpdatePhoto}
                  onDeletePhoto={handleDeleteMedia}
                />
              </Suspense>
            </motion.div>
          )}

          {currentTab === 'photos' && (
            <motion.div
              key="photos-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Suspense fallback={<TabLoadingFallback />}>
                <PhotosPanel
                  photos={exerciseMedia}
                  logs={logs}
                  activeWorkoutKey={activeWorkout ? activeWorkoutPhotoKey(activeWorkout.startTime) : null}
                  activeWorkoutName={activeWorkout?.routineName ?? null}
                  onUploadWorkoutPhoto={handleUploadWorkoutPhoto}
                  onUploadProgressPhoto={handleUploadProgressPhoto}
                  onUpdatePhoto={handleUpdatePhoto}
                  onDeletePhoto={handleDeleteMedia}
                />
              </Suspense>
            </motion.div>
          )}

          {currentTab === 'users' && currentUser.role === 'admin' && (
            <motion.div
              key="users-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Suspense fallback={<TabLoadingFallback />}>
                <UserManagementPanel currentUser={currentUser} exercises={exercises} />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Pie: enlaces legales + atribución requerida por la licencia de ExerciseDB (uso no comercial) */}
      <div className="px-4 pb-4 pt-1 space-y-2">
        <LegalFooterLinks />
        <p className="text-center text-[10px] text-slate-600">
          Animaciones de ejercicios cortesía de{' '}
          <a
            href="https://ascendapi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-400"
          >
            ExerciseDB / AscendAPI
          </a>
        </p>
      </div>

      {/* 3. ACTIVE WORKOUT PANEL FLOATING / EXPANDED HUD */}
      <ActiveWorkoutPanel
        activeWorkout={activeWorkout}
        exercises={displayExercises}
        logs={logs}
        routines={routines}
        progressionRules={progressionRules}
        onUpdateWorkout={handleUpdateActiveWorkout}
        onFinishWorkout={handleFinishWorkout}
        onCancelWorkout={handleCancelWorkout}
        onOpenPlateCalculator={() => setShowPlateCalculator(true)}
        photos={activeWorkout ? workoutPhotos.filter((p) => p.logId === activeWorkoutPhotoKey(activeWorkout.startTime)) : []}
        onUploadPhoto={
          activeWorkout ? (file, onProgress) => handleUploadWorkoutPhoto(activeWorkoutPhotoKey(activeWorkout.startTime), file, onProgress) : undefined
        }
        onDeletePhoto={handleDeleteMedia}
      />

      {/* Plate Calculator Modal */}
      <PlateCalculatorModal
        isOpen={showPlateCalculator}
        onClose={() => setShowPlateCalculator(false)}
        onSelectWeight={(weight) => {
          // El modal se cierra automáticamente; el usuario puede usar el peso calculado como referencia
        }}
      />

      {/* 4. TAB NAVIGATION FOR MOBILE DEVICES (con espacio para el home indicator de iOS) */}
      {/* Cada botón ocupa todo su carril (flex-1 + stretch vertical), no solo
          el icono/texto, para que el área táctil sea cómoda en móvil. */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 pb-[env(safe-area-inset-bottom)] flex z-30 shadow-2xl">
        {[
          { id: 'train', label: 'Entrenar', icon: Play },
          { id: 'routines', label: 'Rutinas', icon: ClipboardList },
          { id: 'exercises', label: 'Ejercicios', icon: Dumbbell },
          { id: 'progress', label: 'Progreso', icon: TrendingUp },
          { id: 'photos', label: 'Fotos', icon: Images },
          ...(currentUser.role === 'admin' ? [{ id: 'users', label: 'Usuarios', icon: Users }] : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 cursor-pointer"
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isSelected ? 'bg-blue-950/50 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-[10px] font-black tracking-tight ${isSelected ? 'text-blue-400 font-black' : 'text-slate-400 font-semibold'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 5. MODAL: Backup / Backup Settings popup */}
      <AnimatePresence>
        {showBackupModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto shadow-2xl border border-slate-800 p-6 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-400" />
                  Copia de Seguridad y Restauración
                </h3>
                <button
                  onClick={() => setShowBackupModal(false)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Exporta todo tu historial de entrenamiento, tus rutinas personalizadas y tus ejercicios de forma offline a un archivo JSON. Puedes restaurarlos en cualquier momento o importarlos en otro dispositivo.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleExportData}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <Download className="h-4.5 w-4.5" />
                  Exportar JSON
                </button>
              </div>

              <div className="border-t border-slate-800 pt-5 space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="h-4 w-4 text-emerald-400" />
                  Restaurar Datos
                </div>

                <form onSubmit={handleImportData} className="space-y-3">
                  <textarea
                    rows={4}
                    required
                    value={backupJson}
                    onChange={(e) => setBackupJson(e.target.value)}
                    placeholder="Pega aquí el contenido del archivo de copia de seguridad JSON..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!backupJson.trim()}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                  >
                    Restaurar e Importar Copia de Seguridad
                  </button>
                </form>
              </div>

              <div className="border-t border-slate-800 pt-5 space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="h-4 w-4 text-amber-400" />
                  Importar desde otra app
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Trae tu historial de Hevy, Strong o FitNotes. Exporta tus datos en CSV desde esa app y elige el archivo aquí.
                </p>
                <ImportPanel
                  exercises={exercises}
                  existingLogIds={existingLogIds}
                  onImport={handleImportWorkouts}
                />
              </div>

              <PasskeySection />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. CELEBRATION MODAL OVERLAY ON WORKOUT COMPLETE */}
      <AnimatePresence>
        {justFinishedWorkout && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="bg-slate-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-800 text-center relative p-8 space-y-6"
            >
              {/* Confetti Visual effect */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-600" />

              <div className="mx-auto h-20 w-20 bg-blue-950/40 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10 relative">
                <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-500 animate-bounce" />
                <Award className="h-10 w-10 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tight">¡Entrenamiento Completado!</h3>
                <p className="text-sm text-slate-400 font-medium">
                  Excelente esfuerzo. Tu constancia te acerca cada día más a tu mejor versión.
                </p>
              </div>

              {/* Aviso de récords batidos en esta sesión */}
              {recordsMessage && (
                <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-left">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Trophy className="h-5 w-5 text-amber-400" />
                  </div>
                  <p className="text-sm font-bold text-amber-300 leading-snug">{recordsMessage}</p>
                </div>
              )}

              {/* Stats Summary box inside celebration */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tiempo</span>
                  <span className="font-extrabold text-slate-200 text-sm">
                    {Math.round(justFinishedWorkout.duration / 60)} min
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ejercicios</span>
                  <span className="font-extrabold text-slate-200 text-sm">
                    {justFinishedWorkout.exercises.length}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Carga Total</span>
                  <span className="font-extrabold text-blue-400 text-sm">
                    {formatEsNumber(justFinishedWorkout.exercises.reduce((sum, we) =>
                      sum + we.sets.reduce((setSum, s) => setSum + (s.completed ? s.weight * s.reps : 0), 0)
                    , 0))} kg
                  </span>
                </div>
              </div>

              {/* Exercises Summary quick bullets */}
              <div className="text-left space-y-1.5 pt-2 max-h-36 overflow-y-auto">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resumen de Series Completadas</div>
                {justFinishedWorkout.exercises.map((item) => {
                  const ex = exercises.find((e) => e.id === item.exerciseId);
                  const completedCount = item.sets.filter((s) => s.completed).length;
                  return (
                    <div key={item.id} className="flex justify-between text-xs text-slate-300 font-semibold border-b border-slate-800/60 pb-1">
                      <span>{ex ? ex.name : 'Ejercicio'}</span>
                      <span className="text-slate-400 font-bold">
                        {completedCount} {completedCount === 1 ? 'serie' : 'series'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => setWorkoutShareOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-sm font-bold transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Share2 className="h-4 w-4" />
                  Compartir entrenamiento
                </button>
                <button
                  onClick={() => {
                    setJustFinishedWorkout(null);
                    setRecordsMessage(null);
                    setWorkoutShareOpen(false);
                  }}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold transition-colors shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  Ver en mi Progreso
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compartir el resumen del entrenamiento recién finalizado como imagen */}
      {justFinishedWorkout && (
        <WorkoutShareModal
          isOpen={workoutShareOpen}
          onClose={() => setWorkoutShareOpen(false)}
          log={justFinishedWorkout}
          exercises={exercises}
          hasRecord={!!recordsMessage}
        />
      )}

      {/* MODAL: Elegir grupo muscular para el Entrenamiento Aleatorio */}
      <AnimatePresence>
        {showRandomWorkoutModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-800"
            >
              <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Shuffle className="h-5 w-5 text-blue-400 shrink-0" />
                  Entrenamiento Aleatorio
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRandomWorkoutModal(false)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[65vh]">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Filtra a tu gusto (todo es multiselección y opcional) y pulsa
                  <span className="text-slate-200 font-semibold"> Comenzar entrenamiento</span>.
                  Lo que dejes vacío cuenta como «todos».
                </p>

                {/* --- GRUPOS MUSCULARES (multiseleccion) --- */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Grupos musculares
                    </span>
                    {randomGroups.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRandomGroups([])}
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLE_GROUPS.map((mg) => {
                      const active = randomGroups.includes(mg);
                      return (
                        <button
                          key={mg}
                          type="button"
                          onClick={() => toggleRandomGroup(mg)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                            active
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: getMuscleColor(mg) }}
                          />
                          {mg}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* --- ZONAS CONCRETAS (multiseleccion, con mini-imagen).
                    Se muestran las zonas de los grupos marcados; si no hay
                    ninguno marcado, aparecen las 18. --- */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Zonas concretas
                    </span>
                    {randomZones.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRandomZones([])}
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableRandomZones.map((zone) => {
                      const active = randomZones.includes(zone);
                      return (
                        <button
                          key={zone}
                          type="button"
                          onClick={() => toggleRandomZone(zone)}
                          className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                            active
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
                      );
                    })}
                  </div>
                </div>

                {/* --- EQUIPAMIENTO (multiseleccion) --- */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Equipamiento
                    </span>
                    {randomEquipment.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRandomEquipment([])}
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_TYPES.map((eq) => {
                      const active = randomEquipment.includes(eq);
                      return (
                        <button
                          key={eq}
                          type="button"
                          onClick={() => toggleRandomEquipment(eq)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                            active
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {eq}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* --- NUMERO DE EJERCICIOS (3 a 10) --- */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nº de ejercicios
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRandomCount(n)}
                        className={`h-9 w-9 rounded-lg text-sm font-bold transition-all cursor-pointer border ${
                          randomCount === n
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* --- PIE: recuento en vivo + boton de comenzar --- */}
              <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-400">
                    <span className={randomPool.length === 0 ? 'text-rose-400 font-bold' : 'text-blue-400 font-bold'}>
                      {randomPool.length}
                    </span>{' '}
                    {randomPool.length === 1 ? 'ejercicio disponible' : 'ejercicios disponibles'}
                  </span>
                  {(randomGroups.length > 0 || randomZones.length > 0 || randomEquipment.length > 0) && (
                    <button
                      type="button"
                      onClick={clearRandomFilters}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Quitar todos los filtros
                    </button>
                  )}
                </div>
                {randomPool.length === 0 && (
                  <p className="text-[11px] text-rose-400 font-semibold">
                    Ningún ejercicio cumple esos filtros. Quita alguno para poder empezar.
                  </p>
                )}
                <button
                  id="btn-random-confirm"
                  type="button"
                  disabled={randomPool.length === 0}
                  onClick={handleStartRandomWorkout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-900 disabled:text-slate-650 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  <Shuffle className="h-4 w-4 shrink-0" />
                  Comenzar entrenamiento
                  {randomPool.length > 0 && (
                    <span className="opacity-80 font-semibold">
                      ({Math.min(randomCount, randomPool.length)} ejercicios)
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => {
          confirmConfig.onCancel?.();
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
}
