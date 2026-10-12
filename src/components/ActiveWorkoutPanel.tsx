import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Square, Plus, Trash2, Dumbbell, Clock, X, ChevronUp, ChevronDown, Check, AlertCircle, Sparkles, History, Gauge, Link2, Link2Off, ClipboardList, Bell, BellOff } from 'lucide-react';
import { Routine, Exercise, WorkoutExercise, WorkoutSet, WorkoutLog } from '../types';
import ExerciseLibraryPanel from './ExerciseLibraryPanel';
import ConfirmDialog from './ConfirmDialog';
import DecimalInput from './DecimalInput';
import { useLightbox } from '../context/LightboxContext';
import { getStaticThumbUrl } from '../utils/media';
import { getLastPerformanceSets } from '../utils/lastPerformance';
import { ProgressionRule, prefillWithProgression } from '../utils/progressionRules';
import { detectSetAnomaly } from '../utils/anomaly';
import { SET_KINDS, SetKind, kindOf, withKind, setLabel, supersetLetters, restAfterSet, toggleSupersetWithNext } from '../utils/setTypes';
import AnchoredPopover from './AnchoredPopover';
import SetKindMenu from './SetKindMenu';
import {
  isRestPushEnabled,
  enableRestPush,
  disableRestPush,
  scheduleRestPush,
  cancelRestPush,
  clearRestNotifications,
} from '../utils/restPush';
import { testPush, MediaItem } from '../api/client';
import PhotoCaptureButtons from './PhotoCaptureButtons';
import WorkoutPhotos from './WorkoutPhotos';

// Margen para avisar del fin de un descanso que terminó mientras la app estaba
// en segundo plano: si al volver han pasado menos de esto, se da el aviso; si
// ha pasado más, se descarta en silencio (evita pitidos/vibraciones por
// sorpresa al desbloquear el móvil un rato después).
const REST_ALERT_GRACE_MS = 90 * 1000;

// Serie | Peso | Reps | RPE | Hecho | Quitar. RPE, Hecho y Quitar tienen ancho
// fijo para que el check no se aplaste en móvil.
const SET_ROW_COLUMNS = '2rem minmax(0,1fr) minmax(0,1fr) 2.25rem 2.25rem 1.75rem';

// Los 10 valores del RPE, de 1 a 10. hint = repeticiones que quedaban en reserva
// (10 - RPE; 0 = al fallo): una sola palabra o cifra para que quepa bajo cada
// botón sin que se monten unas etiquetas sobre otras.
const RPE_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const value = i + 1;
  const reserve = 10 - value;
  return { value, hint: reserve === 0 ? 'fallo' : String(reserve) };
});

function rpeColor(rpe: number): string {
  if (rpe <= 5) return '#34d399';
  if (rpe <= 7) return '#fbbf24';
  if (rpe <= 8) return '#fb923c';
  return '#ef4444';
}

function hasValidPhoto(ex?: Exercise) {
  return (
    !!ex?.imageUrl &&
    !ex.imageUrl.includes('placeholder') &&
    (ex.imageUrl.startsWith('http') || ex.imageUrl.startsWith('/'))
  );
}

interface ActiveWorkoutPanelProps {
  activeWorkout: {
    routineId?: string;
    routineName: string;
    startTime: string; // ISO String
    exercises: WorkoutExercise[];
  } | null;
  exercises: Exercise[];
  logs: WorkoutLog[];
  routines: Routine[];
  progressionRules: ProgressionRule[];
  onUpdateWorkout: (updater: (prev: any) => any) => void;
  onFinishWorkout: (durationSeconds: number) => void;
  onCancelWorkout: () => void;
  onOpenPlateCalculator?: () => void;
  // Fotos de este entrenamiento (se pueden añadir en cualquier momento)
  photos?: MediaItem[];
  onUploadPhoto?: (file: File, onProgress: (fraction: number) => void) => Promise<void>;
  onDeletePhoto?: (id: string) => Promise<void>;
}

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
  const { openLightbox } = useLightbox();
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showAddRoutine, setShowAddRoutine] = useState(false);

  // Preferencia de descanso automático (se recuerda entre entrenamientos)
  const [restTimerEnabled, setRestTimerEnabled] = useState(() => {
    return localStorage.getItem('hevy_rest_timer_enabled') !== 'false';
  });
  const toggleRestTimerEnabled = () => {
    setRestTimerEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('hevy_rest_timer_enabled', String(next));
      if (!next) {
        // Al desactivarlo, cancela cualquier descanso que esté contando ahora mismo
        setRestTimeLeft(null);
        restEndTimeRef.current = null;
        cancelRestPush();
      }
      return next;
    });
  };

  // Segundos de descanso "por defecto" para todo el entrenamiento actual:
  // permite ajustarlos de un vistazo desde la cabecera en vez de tener que
  // entrar ejercicio por ejercicio. Se recuerda entre entrenamientos y, al
  // cambiarlo, se aplica de inmediato a todos los ejercicios de la sesión
  // (cada ejercicio se puede seguir ajustando individualmente después).
  const [defaultRestSeconds, setDefaultRestSeconds] = useState<number>(() => {
    const saved = parseInt(localStorage.getItem('hevy_default_rest_seconds') || '', 10);
    return Number.isFinite(saved) && saved > 0 ? saved : 90;
  });
  const handleChangeDefaultRestSeconds = (seconds: number) => {
    const clamped = Math.min(600, Math.max(10, seconds));
    setDefaultRestSeconds(clamped);
    localStorage.setItem('hevy_default_rest_seconds', String(clamped));
    onUpdateWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((item: WorkoutExercise) => ({ ...item, restTime: clamped })),
      };
    });
  };
  // Texto "en bruto" del input de segundos: se muestra tal cual mientras se
  // escribe (sin reformatear cada tecla, que "pelea" con el usuario al
  // sustituir un valor ya existente) y solo se valida/aplica al perder el foco.
  const [restSecondsText, setRestSecondsText] = useState(String(defaultRestSeconds));
  const [restSecondsFocused, setRestSecondsFocused] = useState(false);
  useEffect(() => {
    if (!restSecondsFocused) setRestSecondsText(String(defaultRestSeconds));
  }, [defaultRestSeconds, restSecondsFocused]);

  // Confirmation state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  // Rest Timer State
  const [restTimeLeft, setRestTimeLeft] = useState<number | null>(null);
  const [restInitialTime, setRestInitialTime] = useState<number>(0);
  const [isRestPaused, setIsRestPaused] = useState(false);
  const [currentRestExerciseName, setCurrentRestExerciseName] = useState('');

  // Ref for timer interval
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Reutilizamos un único AudioContext (los navegadores limitan a ~6; crear uno
  // por cada descanso agotaba el límite y dejaba de sonar).
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Timestamp absoluto (Date.now() + segundos) de cuándo debe terminar el
  // descanso actual. Se usa en vez de restar 1 en cada tick para que el
  // conteo sea exacto aunque el intervalo se retrase o se congele del todo
  // (pestaña en segundo plano, pantalla bloqueada): al recuperar el foco se
  // recalcula solo con el tiempo real transcurrido. null = sin descanso activo o en pausa.
  const restEndTimeRef = useRef<number | null>(null);
  // Evita disparar el pitido/vibración de fin de descanso más de una vez.
  const restEndFiredRef = useRef(false);
  // Con la app a la vista, el aviso push se cancela justo antes del final (ya
  // suena el pitido); esto evita cancelarlo más de una vez por descanso.
  const restPushClearedRef = useRef(false);
  // Wake Lock: mantiene la pantalla encendida durante el entrenamiento para
  // que el descanso siga corriendo en vez de que el móvil se bloquee solo.
  const wakeLockRef = useRef<any>(null);

  // Audio indicator when timer ends: un pitido triple (mismo tono, tres veces)
  // usando el sintetizador nativo del navegador para no depender de assets externos.
  const playTimerEndSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      // Un único pitido con envolvente suave (evita "clics" al empezar/parar).
      // Onda "triangle" + volumen cerca del máximo para que se oiga bien
      // incluso con música de fondo o el móvil en el bolsillo.
      const playBeep = (startTime: number) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(880, startTime); // A5, tono clásico de pitido

        gainNode.gain.setValueAtTime(0.0001, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.9, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.2);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.22);
      };

      const now = audioCtx.currentTime;
      playBeep(now);
      playBeep(now + 0.26);
      playBeep(now + 0.52); // tercer pitido para reforzar el aviso
    } catch (e) {
      console.warn("Audio Context blocked or not supported yet", e);
    }

    // Vibración: solo Android la soporta (iOS Safari nunca ha implementado
    // la Vibration API, ni siquiera como PWA instalada), pero se dispara
    // igual con feature-detection para no romper nada donde sí funciona.
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    } catch {
      // Ignorar: algunos navegadores lanzan si se llama sin gesto de usuario reciente
    }
  };

  // Stopwatch ticking
  useEffect(() => {
    if (activeWorkout) {
      const startMs = new Date(activeWorkout.startTime).getTime();
      const updateElapsed = () => {
        const nowMs = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
      };
      
      updateElapsed();
      elapsedTimerRef.current = setInterval(updateElapsed, 1000);
    } else {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      setElapsedSeconds(0);
    }

    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
    // Depende solo de startTime, no del objeto activeWorkout entero: ese objeto
    // se recrea en CADA edición (cada tecla en un peso), lo que destruía y
    // recreaba el intervalo del cronómetro constantemente y contribuía a los
    // tirones/parpadeos en pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkout?.startTime]);

  // Rest Timer ticking: se calcula a partir de un timestamp absoluto de fin
  // (restEndTimeRef), no restando 1 cada segundo — así el conteo es exacto
  // aunque el intervalo se retrase o el navegador lo congele por completo
  // mientras la pestaña está en segundo plano o la pantalla bloqueada; al
  // recuperar el foco se recalcula de inmediato con el tiempo real transcurrido.
  useEffect(() => {
    if (restTimeLeft === null) return;

    const tick = () => {
      if (restEndTimeRef.current === null) return; // en pausa: no avanzar
      const endTime = restEndTimeRef.current;
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setRestTimeLeft(remaining);

      if (remaining <= 1 && !restPushClearedRef.current && document.visibilityState === 'visible') {
        restPushClearedRef.current = true;
        cancelRestPush();
      }

      if (remaining === 0 && !restEndFiredRef.current) {
        // Con la pantalla apagada o la app en segundo plano, ni el pitido ni la
        // vibración se perciben (el navegador congela la pestaña y bloquea
        // navigator.vibrate). Antes se marcaba el aviso como "ya dado" igual, así
        // que al volver no sonaba nada; y si sí saltaba al volver, lo hacía
        // aunque el descanso hubiera terminado hacía una hora, provocando esa
        // vibración fantasma al desbloquear el móvil.
        if (document.visibilityState === 'visible') {
          const overdueMs = Date.now() - endTime;
          // Solo se avisa si el descanso acaba de terminar; si terminó hace
          // mucho, se marca como avisado en silencio.
          if (overdueMs <= REST_ALERT_GRACE_MS) playTimerEndSound();
          restEndFiredRef.current = true;
        }
        // Si está oculta no se marca como avisado: se decidirá al volver.
      }
    };

    tick();
    restTimerRef.current = setInterval(tick, 500);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restTimeLeft !== null]);

  // Mantiene la pantalla encendida mientras hay un entrenamiento activo, para
  // que el descanso entre series siga corriendo aunque el usuario no toque
  // el móvil (si no, el sistema operativo apaga la pantalla solo y algunos
  // navegadores móviles congelan por completo la pestaña en ese momento).
  useEffect(() => {
    let cancelled = false;
    const requestLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          const sentinel = await (navigator as any).wakeLock.request('screen');
          if (cancelled) {
            sentinel.release?.().catch(() => {});
            return;
          }
          wakeLockRef.current = sentinel;
          // CLAVE: el navegador libera el wake lock él solo cada vez que la
          // pestaña se oculta (bloquear el móvil, cambiar de app). Sin escuchar
          // 'release' el ref se quedaba apuntando a un lock ya muerto, la
          // condición de abajo (!wakeLockRef.current) nunca se cumplía y NUNCA
          // se volvía a pedir: por eso la pantalla acababa apagándose a mitad
          // del entrenamiento y el descanso dejaba de contar.
          sentinel.addEventListener?.('release', () => {
            if (wakeLockRef.current === sentinel) wakeLockRef.current = null;
          });
        }
      } catch {
        // Algunos navegadores/contextos lo deniegan (ej. batería baja); no es crítico
      }
    };
    requestLock();

    // El wake lock se libera solo al ocultar la pestaña; hay que volver a
    // pedirlo al regresar para que la pantalla no se bloquee de nuevo.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !cancelled && !wakeLockRef.current) {
        requestLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      wakeLockRef.current?.release?.().catch(() => {});
      wakeLockRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!activeWorkout]);

  // Menús de RPE y de tipo de serie: serie que lo abrió y botón junto al que se muestra
  const [rpePicker, setRpePicker] = useState<{ setId: string; anchor: HTMLElement } | null>(null);
  const [kindPicker, setKindPicker] = useState<{ setId: string; anchor: HTMLElement } | null>(null);

  // Fotos desde los iconos de la cabecera (las miniaturas están al final del panel)
  const [headerPhotoProgress, setHeaderPhotoProgress] = useState<number | null>(null);
  const handleHeaderPhotos = async (files: File[]) => {
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

  // Aviso de fin de descanso con la app cerrada (notificación push)
  const [restPushOn, setRestPushOn] = useState(isRestPushEnabled);
  const [restPushBusy, setRestPushBusy] = useState(false);
  const [restPushMessage, setRestPushMessage] = useState<string | null>(null);

  // Al terminar o cancelar el entrenamiento no debe llegar un aviso pendiente,
  // y al volver a la app sobra la notificación del descanso ya visto.
  useEffect(() => {
    if (!activeWorkout) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') clearRestNotifications();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      cancelRestPush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!activeWorkout]);

  if (!activeWorkout) return null;

  const toggleRestPush = async () => {
    setRestPushMessage(null);
    setRestPushBusy(true);
    try {
      if (restPushOn) {
        await disableRestPush();
        setRestPushOn(false);
      } else {
        await enableRestPush();
        setRestPushOn(true);
        const res = await testPush().catch(() => null);
        setRestPushMessage(
          res?.success
            ? 'Avisos activados: te ha llegado una notificación de prueba.'
            : 'Avisos activados, pero la notificación de prueba no salió. Revisa los permisos del navegador.'
        );
        // Si ya hay un descanso contando, se programa su aviso
        if (restEndTimeRef.current) scheduleRestPush(restEndTimeRef.current, currentRestExerciseName);
      }
    } catch (err) {
      setRestPushMessage(err instanceof Error ? err.message : 'No se pudieron activar los avisos.');
    } finally {
      setRestPushBusy(false);
    }
  };

  const supersetLetterById = supersetLetters(activeWorkout.exercises);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Al marcar una serie como hecha se comprueba si el peso o las repeticiones
  // son anormalmente altos para ese ejercicio (típico error de tecleo: "89"
  // en vez de "8"). Si lo son, se pide confirmación antes de darla por buena,
  // con la opción de volver atrás y corregir el valor.
  const handleToggleSetComplete = (exerciseInstanceId: string, setId: string, exName: string, customRest?: number) => {
    const targetExercise = activeWorkout?.exercises.find((we: WorkoutExercise) => we.id === exerciseInstanceId);
    const targetSet = targetExercise?.sets.find((s: WorkoutSet) => s.id === setId);
    const willComplete = targetSet ? !targetSet.completed : false;

    if (willComplete && targetExercise && targetSet) {
      const anomaly = detectSetAnomaly(targetExercise.exerciseId, targetSet.weight, targetSet.reps, logs);
      if (anomaly) {
        setConfirmConfig({
          isOpen: true,
          title: 'Valor inusual',
          message: anomaly.message,
          confirmText: 'Sí, es correcto',
          cancelText: 'Corregir',
          type: 'warning',
          onConfirm: () => applyToggleSetComplete(exerciseInstanceId, setId, exName, customRest),
        });
        return;
      }
    }

    applyToggleSetComplete(exerciseInstanceId, setId, exName, customRest);
  };

  const applyToggleSetComplete = (exerciseInstanceId: string, setId: string, exName: string, customRest?: number) => {
    onUpdateWorkout((prev) => {
      if (!prev) return prev;
      let targetRestTime = 90; // Fallback default

      const updatedExercises = prev.exercises.map((we: WorkoutExercise, exIndex: number) => {
        if (we.id !== exerciseInstanceId) return we;

        // Find default exercise rest timer if no custom one exists
        const matchedEx = exercises.find((e) => e.id === we.exerciseId);
        const normalRest = we.restTime || matchedEx?.defaultRestTime || 90;

        return {
          ...we,
          sets: we.sets.map((s: WorkoutSet, setIndex: number) => {
            if (s.id !== setId) return s;
            const newCompleted = !s.completed;
            // Drop set / rest-pause a continuación o superserie: descanso corto o ninguno
            targetRestTime = restAfterSet(prev.exercises, exIndex, setIndex, normalRest);

            // If checking a set to completed, initiate rest timer! (a menos que esté desactivado)
            if (newCompleted && restTimerEnabled && targetRestTime > 0) {
              restEndTimeRef.current = Date.now() + targetRestTime * 1000;
              restEndFiredRef.current = false;
              restPushClearedRef.current = false;
              scheduleRestPush(restEndTimeRef.current, exName);
              setRestInitialTime(targetRestTime);
              setRestTimeLeft(targetRestTime);
              setIsRestPaused(false);
              setCurrentRestExerciseName(exName);
            }
            return { ...s, completed: newCompleted };
          }),
        };
      });

      return { ...prev, exercises: updatedExercises };
    });
  };

  const handleUpdateWeightRep = (exerciseInstanceId: string, setId: string, field: 'weight' | 'reps', value: number) => {
    onUpdateWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((we: WorkoutExercise) => {
          if (we.id !== exerciseInstanceId) return we;
          return {
            ...we,
            sets: we.sets.map((s: WorkoutSet) => {
              if (s.id !== setId) return s;
              return { ...s, [field]: value };
            }),
          };
        }),
      };
    });
  };

  const handleUpdateRPE =(exerciseInstanceId: string, setId: string, rpe?: number) => {
    setRpePicker(null);
    onUpdateWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((we: WorkoutExercise) => {
          if (we.id !== exerciseInstanceId) return we;
          return {
            ...we,
            sets: we.sets.map((s: WorkoutSet) => {
              if (s.id !== setId) return s;
              return { ...s, rpe };
            }),
          };
        }),
      };
    });
  };

  const handleSetKind = (exerciseInstanceId: string, setId: string, kind: SetKind) => {
    setKindPicker(null);
    onUpdateWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((we: WorkoutExercise) =>
          we.id !== exerciseInstanceId
            ? we
            : { ...we, sets: we.sets.map((s: WorkoutSet) => (s.id === setId ? withKind(s, kind) : s)) }
        ),
      };
    });
  };

  // Une el ejercicio con el siguiente en una superserie, o lo separa del grupo
  const handleToggleSuperset = (exerciseIndex: number) => {
    onUpdateWorkout((prev) => {
      if (!prev) return prev;
      return { ...prev, exercises: toggleSupersetWithNext(prev.exercises, exerciseIndex) };
    });
  };

  const handleAddSet = (exerciseInstanceId: string) => {
    onUpdateWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((we: WorkoutExercise) => {
          if (we.id !== exerciseInstanceId) return we;
          const lastSet = we.sets[we.sets.length - 1];
          return {
            ...we,
            sets: [
              ...we.sets,
              {
                id: `set-${Date.now()}-${we.sets.length + 1}`,
                weight: lastSet ? lastSet.weight : 0,
                reps: lastSet ? lastSet.reps : 10,
                completed: false,
              },
            ],
          };
        }),
      };
    });
  };

  const handleRemoveSet = (exerciseInstanceId: string, setId: string) => {
    onUpdateWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((we: WorkoutExercise) => {
          if (we.id !== exerciseInstanceId) return we;
          if (we.sets.length <= 1) return we;
          return {
            ...we,
            sets: we.sets.filter((s: WorkoutSet) => s.id !== setId),
          };
        }),
      };
    });
  };

  const handleAddExerciseToWorkout = (ex: Exercise) => {
    onUpdateWorkout((prev) => {
      if (!prev) return prev;
      // Igual que al iniciar una rutina: si ya se ha entrenado antes este
      // ejercicio, los campos vienen con los pesos/repeticiones de la última vez.
      const baseSets: WorkoutSet[] = [
        { id: `set-act-${Date.now()}-1`, weight: 0, reps: 10, completed: false },
        { id: `set-act-${Date.now()}-2`, weight: 0, reps: 10, completed: false },
        { id: `set-act-${Date.now()}-3`, weight: 0, reps: 10, completed: false },
      ];
      const newWe: WorkoutExercise = {
        id: `we-active-${Date.now()}`,
        exerciseId: ex.id,
        restTime: ex.defaultRestTime,
        sets: prefillWithProgression(
          baseSets,
          getLastPerformanceSets(ex.id, logs),
          progressionRules.find((r) => r.exerciseId === ex.id)
        ),
      };
      return {
        ...prev,
        exercises: [...prev.exercises, newWe],
      };
    });
    setShowAddExercise(false);
  };

  // Combina otra rutina con la sesión en curso: sus ejercicios se añaden al
  // final, prerrellenados igual que al empezar una rutina.
  const handleAddRoutineToWorkout = (routine: Routine) => {
    onUpdateWorkout((prev) => {
      if (!prev) return prev;
      const stamp = Date.now();
      const added: WorkoutExercise[] = routine.exercises.map((re, i) => ({
        id: `we-active-${stamp}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        exerciseId: re.exerciseId,
        restTime: re.restTime,
        ...(re.supersetId ? { supersetId: `${re.supersetId}-${stamp}` } : {}),
        sets: prefillWithProgression(
          re.sets.map((s, j) => ({
            id: `set-act-${stamp}-${i}-${j}`,
            weight: s.weight,
            reps: s.reps,
            completed: false,
            ...(s.isWarmup ? { isWarmup: true } : {}),
            ...(s.setType ? { setType: s.setType } : {}),
          })),
          getLastPerformanceSets(re.exerciseId, logs),
          progressionRules.find((r) => r.exerciseId === re.exerciseId)
        ),
      }));
      const alreadyNamed = prev.routineName.split(' + ').includes(routine.name);
      return {
        ...prev,
        routineName: alreadyNamed ? prev.routineName : `${prev.routineName} + ${routine.name}`,
        exercises: [...prev.exercises, ...added],
      };
    });
    setShowAddRoutine(false);
  };

  const handleRemoveExerciseFromWorkout = (exerciseInstanceId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Quitar Ejercicio',
      message: '¿Seguro que quieres quitar este ejercicio del entrenamiento actual?',
      confirmText: 'Quitar',
      type: 'danger',
      onConfirm: () => {
        onUpdateWorkout((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            exercises: prev.exercises.filter((we: WorkoutExercise) => we.id !== exerciseInstanceId),
          };
        });
      },
    });
  };

  const handleAdjustRest = (seconds: number) => {
    if (restEndTimeRef.current !== null) {
      restEndTimeRef.current += seconds * 1000;
      restPushClearedRef.current = false;
      if (restEndTimeRef.current > Date.now()) scheduleRestPush(restEndTimeRef.current, currentRestExerciseName);
    }
    setRestTimeLeft((prev) => {
      if (prev === null) return null;
      const calculated = prev + seconds;
      return Math.max(0, calculated);
    });
  };


  // Aviso de descanso: fijo debajo de los botones Cancelar/Finalizar (no
  // se desplaza con la lista de ejercicios). Compacto a propósito (sin
  // subtítulo decorativo, padding ajustado) para no restar espacio a la
  // zona con scroll, sin reducir el tamaño de ningún texto.
  const restTimerWidget = (
    <AnimatePresence>
      {restTimeLeft !== null && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto', transition: { type: 'spring', damping: 28, stiffness: 300 } }}
          exit={{ opacity: 0, height: 0, transition: { duration: 0.15, ease: 'easeIn' } }}
          className="overflow-hidden"
        >
          <div
            className={`rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 border shadow-md transition-colors ${
              restTimeLeft === 0
                ? 'bg-rose-600 border-rose-700 text-white animate-bounce'
                : 'bg-blue-950 border-blue-900 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-1.5 rounded-lg shrink-0 ${restTimeLeft === 0 ? 'bg-white text-rose-600' : 'bg-blue-900/60'}`}>
                <Clock className={`h-5 w-5 ${restTimeLeft > 0 && !isRestPaused ? 'animate-spin text-blue-400' : ''}`} />
              </div>
              <div className={`text-xs uppercase font-extrabold tracking-wider truncate ${restTimeLeft === 0 ? 'text-rose-100' : 'text-blue-300'}`}>
                {restTimeLeft === 0 ? '¡DESCANSO COMPLETADO!' : `DESCANSO • ${currentRestExerciseName}`}
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
              {/* Time countdown displays */}
              <span className="font-mono text-2xl font-black min-w-[68px] text-center text-blue-400">
                {formatTime(restTimeLeft)}
              </span>

              {restTimeLeft > 0 && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAdjustRest(-15)}
                    className="px-1.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    -15s
                  </button>
                  <button
                    onClick={() => handleAdjustRest(15)}
                    className="px-1.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    +15s
                  </button>
                  <button
                    onClick={() => {
                      setIsRestPaused((prevPaused) => {
                        const next = !prevPaused;
                        if (next) {
                          // Pausar: se congela, deja de avanzar el timestamp de fin
                          restEndTimeRef.current = null;
                          cancelRestPush();
                        } else {
                          // Reanudar: recalcula el fin a partir del tiempo restante actual
                          restEndTimeRef.current = Date.now() + (restTimeLeft ?? 0) * 1000;
                          restPushClearedRef.current = false;
                          scheduleRestPush(restEndTimeRef.current, currentRestExerciseName);
                        }
                        return next;
                      });
                    }}
                    className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {isRestPaused ? <Play className="h-4 w-4 fill-white" /> : <Pause className="h-4 w-4" />}
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setRestTimeLeft(null);
                  restEndTimeRef.current = null;
                  if (restTimerRef.current) clearInterval(restTimerRef.current);
                  cancelRestPush();
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  restTimeLeft === 0 ? 'bg-white/25 hover:bg-white/40 text-white' : 'hover:bg-white/15 text-blue-200 hover:text-white'
                }`}
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* 1. COLLAPSED FLOATING HUD AT THE BOTTOM (evita la barra de pestañas móvil y el home indicator de iOS) */}
      {!isExpanded && (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-4 left-4 right-4 z-40 bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800 flex items-center justify-between gap-3 max-w-xl mx-auto">
          <div className="flex items-center gap-3 min-w-0" onClick={() => setIsExpanded(true)}>
            <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center animate-pulse shrink-0">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <div className="cursor-pointer text-left min-w-0">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Entrenamiento Activo</div>
              <div className="font-bold text-sm truncate">{activeWorkout.routineName}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-sm font-bold bg-slate-850 px-2.5 py-1 rounded-lg text-blue-400 border border-blue-500/25">
              {formatTime(elapsedSeconds)}
            </span>
            <button
              id="btn-expand-workout"
              onClick={() => setIsExpanded(true)}
              className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-300 hover:text-white cursor-pointer shrink-0"
              title="Expandir"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. EXPANDED FULL INTERACTIVE SCREEN WORKOUT PANEL */}
      <AnimatePresence>
        {isExpanded && (
          <div
            // Fondo oscuro SÓLIDO (sin backdrop-blur a propósito): el panel de
            // la rutina activa se repinta cada segundo por el cronómetro, y en
            // móvil cualquier repintado dentro de una capa con backdrop-filter
            // re-rasteriza todo el desenfoque. Eso, sumado al repintado forzado
            // que hace el navegador al volver de segundo plano (desbloquear el
            // móvil o cambiar de app), era la causa de los parpadeos. Un fondo
            // sólido casi opaco se ve igual a pantalla completa y no parpadea.
            className="fixed inset-0 bg-slate-950/95 z-50 flex items-end justify-center"
            onClick={(e) => {
              // Cerrar al tocar el fondo oscuro (fuera del panel), como cualquier modal estándar
              if (e.target === e.currentTarget) setIsExpanded(false);
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-slate-900 w-full max-w-3xl rounded-t-3xl h-[92dvh] flex flex-col overflow-hidden shadow-2xl border-t border-slate-800"
            >
              {/* Drag bar / Collapse Handle: área táctil grande y explícita */}
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

              {/* Workout Header Panel */}
              <div className="bg-slate-900 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 shadow-lg space-y-3">
                {/* Fila 1: nombre de la rutina + minimizar */}
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black text-white text-base sm:text-xl truncate min-w-0">{activeWorkout.routineName}</h3>
                  <button
                    onClick={() => setIsExpanded(false)}
                    title="Minimizar"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-all cursor-pointer shrink-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {/* Fila 2: cronómetro y descanso automático (con sus segundos). Sin
                    "Iniciado hace X min": es redundante con el propio cronómetro y solo
                    restaba espacio. Ambos bloques son "shrink-0" (tamaño fijo, nunca se
                    comprimen ni se parten) para que quepan siempre juntos en una fila. */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-500/20 animate-pulse shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(elapsedSeconds)}
                  </span>

                  <div
                    className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
                      restTimerEnabled
                        ? 'text-blue-400 bg-blue-950/40 border-blue-500/20'
                        : 'text-slate-500 bg-slate-950 border-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={toggleRestTimerEnabled}
                      title={restTimerEnabled ? 'Desactivar descanso automático' : 'Activar descanso automático'}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Descanso {restTimerEnabled ? 'ON' : 'OFF'}
                    </button>
                    <span className="w-px h-3 bg-current opacity-25 shrink-0" />
                    <input
                      type="number"
                      min={10}
                      max={600}
                      value={restSecondsText}
                      onFocus={(e) => {
                        setRestSecondsFocused(true);
                        e.target.select();
                      }}
                      onChange={(e) => setRestSecondsText(e.target.value)}
                      onBlur={() => {
                        setRestSecondsFocused(false);
                        handleChangeDefaultRestSeconds(parseInt(restSecondsText) || defaultRestSeconds);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      title="Segundos de descanso (se aplica a todos los ejercicios de este entrenamiento)"
                      className="w-8 bg-transparent text-center font-extrabold focus:outline-none"
                    />
                    <span>s</span>
                  </div>

                  <button
                    type="button"
                    onClick={toggleRestPush}
                    disabled={restPushBusy}
                    title={restPushOn ? 'Desactivar aviso con la app cerrada' : 'Avisarme del fin del descanso aunque la app esté cerrada'}
                    className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all shrink-0 cursor-pointer disabled:opacity-50 ${
                      restPushOn
                        ? 'text-amber-300 bg-amber-950/40 border-amber-500/30'
                        : 'text-slate-500 bg-slate-950 border-slate-800'
                    }`}
                  >
                    {restPushOn ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                    Aviso {restPushOn ? 'ON' : 'OFF'}
                  </button>
                </div>
                {restPushMessage && (
                  <div className="text-[11px] text-amber-200/90 bg-amber-950/30 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                    {restPushMessage}
                  </div>
                )}

                {/* Fila 3: acciones principales, siempre visibles a lo ancho completo */}
                <div className="flex items-center gap-2">
                  {onUploadPhoto && (
                    <div
                      className="relative flex items-center bg-slate-800 border border-slate-700 rounded-xl shrink-0"
                      title="Fotos del entrenamiento"
                    >
                      <PhotoCaptureButtons compact allowVideo onFiles={handleHeaderPhotos} disabled={headerPhotoProgress !== null} />
                      {photos.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-blue-600 text-[9px] font-black text-white flex items-center justify-center">
                          {photos.length}
                        </span>
                      )}
                      {headerPhotoProgress !== null && (
                        <span className="absolute inset-x-1 bottom-0.5 h-0.5 bg-slate-700 rounded-full overflow-hidden">
                          <span className="block h-full bg-blue-500" style={{ width: `${Math.max(5, headerPhotoProgress * 100)}%` }} />
                        </span>
                      )}
                    </div>
                  )}
                  {onOpenPlateCalculator && (
                    <button
                      onClick={onOpenPlateCalculator}
                      title="Calculadora de discos"
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      ⚙️
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setConfirmConfig({
                        isOpen: true,
                        title: 'Cancelar Entrenamiento',
                        message: '¿Seguro que deseas cancelar este entrenamiento? Se perderán todos los datos actuales.',
                        confirmText: 'Sí, cancelar',
                        type: 'danger',
                        onConfirm: () => {
                          onCancelWorkout();
                          setIsExpanded(false);
                        },
                      });
                    }}
                    className="flex-1 justify-center px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Square className="h-3.5 w-3.5" />
                    Cancelar
                  </button>
                  <button
                    id="btn-finish-active-workout"
                    onClick={() => {
                      onFinishWorkout(elapsedSeconds);
                      setIsExpanded(false);
                    }}
                    className="flex-1 justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    Finalizar
                  </button>
                </div>

                {/* Fila 4: aviso de descanso, fijo aquí (no se mueve con el scroll) */}
                {restTimerWidget}
              </div>

              {/* Main Workout Panel Scrollable Content */}
              <div className="flex-1 overflow-y-auto bg-slate-950 px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-6">
                {/* Workout Exercises Block */}
                <div className="space-y-6">
                  {activeWorkout.exercises.map((we, index) => {
                    const ex = exercises.find((e) => e.id === we.exerciseId);
                    if (!ex) return null;
                    const supersetLetter = supersetLetterById[we.id];
                    const nextExercise = activeWorkout.exercises[index + 1];
                    const linkedWithNext = !!we.supersetId && we.supersetId === nextExercise?.supersetId;

                    return (
                        <div
                          key={we.id}
                          id={`workout-exercise-card-${we.id}`}
                          className={`bg-slate-900 rounded-2xl border shadow-xl overflow-hidden ${
                            supersetLetter ? 'border-violet-500/50 border-l-4 border-l-violet-500' : 'border-slate-800'
                          }`}
                        >
                        {supersetLetter && (
                          <div className="px-3 py-1 bg-violet-950/40 border-b border-violet-500/30 text-[10px] font-black uppercase tracking-wider text-violet-300">
                            Superserie {supersetLetter} · sin descanso entre ejercicios del grupo
                          </div>
                        )}
                        {/* Header Section */}
                        <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-14 sm:w-16 shrink-0 aspect-square rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                              {hasValidPhoto(ex) ? (
                                <img
                                  src={getStaticThumbUrl(ex.imageUrl)}
                                  alt={ex.name}
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                  onClick={() => openLightbox(ex.imageUrl, ex.name)}
                                  className="w-full h-full object-contain cursor-zoom-in"
                                />
                              ) : (
                                <Dumbbell className="h-5 w-5 text-blue-400" />
                              )}
                            </div>
                            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-slate-850 text-slate-300 text-sm font-bold border border-slate-800 shrink-0">
                              {index + 1}
                            </span>
                            <div className="text-left min-w-0 flex-1">
                              <h4 className="font-extrabold text-white text-base leading-tight break-words">{ex.name}</h4>
                              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider break-words">{ex.muscleGroup} • {ex.equipment}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 justify-between sm:justify-start shrink-0">
                            {/* Descanso recomendado del ejercicio: informativo, fijo. El
                                descanso real que se aplica ya se ajusta desde la cabecera
                                (se aplica a todos los ejercicios de golpe). */}
                            <div
                              className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-xl text-[10px] font-bold text-slate-300"
                              title="Descanso recomendado para este ejercicio"
                            >
                              <Clock className="h-3 w-3 text-blue-400" />
                              <span>Recomendado: <span className="text-blue-400">{ex.defaultRestTime}s</span></span>
                            </div>
                            {nextExercise && (
                              <button
                                type="button"
                                onClick={() => handleToggleSuperset(index)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer ${
                                  linkedWithNext
                                    ? 'bg-violet-950/40 border-violet-500/40 text-violet-300 hover:bg-violet-900/40'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                                title={linkedWithNext ? 'Separar del siguiente ejercicio' : 'Hacer superserie con el siguiente ejercicio'}
                              >
                                {linkedWithNext ? <Link2Off className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                                {linkedWithNext ? 'Separar' : 'Superserie'}
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveExerciseFromWorkout(we.id)}
                              className="text-slate-500 hover:text-rose-400 p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Remover Ejercicio"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Sets List */}
                        <div className="p-4 space-y-3 bg-slate-900">
                          {/* Los pesos/repeticiones de la última vez ya vienen
                              prerrellenados en los propios campos al iniciar la
                              rutina, así que aquí no hace falta mostrarlos aparte. */}
                          <div
                            className="grid gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-b border-slate-800 pb-2"
                            style={{ gridTemplateColumns: SET_ROW_COLUMNS }}
                          >
                            <span className="text-left whitespace-nowrap">Serie</span>
                            <span className="whitespace-nowrap">Peso</span>
                            <span className="whitespace-nowrap">Reps</span>
                            <span className="whitespace-nowrap">RPE</span>
                            <span className="flex justify-center"><Check className="h-4 w-4 stroke-[3px]" /></span>
                            <span></span>
                          </div>

                          {we.sets.map((set, setIndex) => (
                            <div
                              key={set.id}
                              className={`relative grid gap-1.5 items-center text-center py-1.5 rounded-xl transition-all ${
                                set.completed ? 'bg-emerald-950/20 border-t border-b border-emerald-900/40' : 'hover:bg-slate-850/50'
                              }`}
                              style={{ gridTemplateColumns: SET_ROW_COLUMNS }}
                            >
                              {/* Set Index / tipo de serie (tocar para cambiarlo) */}
                              <button
                                type="button"
                                onClick={(e) =>
                                  setKindPicker(kindPicker?.setId === set.id ? null : { setId: set.id, anchor: e.currentTarget })
                                }
                                title="Tipo de serie"
                                className="text-sm font-bold text-left pl-1 cursor-pointer whitespace-nowrap"
                                style={{ color: SET_KINDS.find((k) => k.kind === kindOf(set))?.color }}
                              >
                                {setLabel(we.sets, setIndex)}
                              </button>

                              {kindPicker?.setId === set.id && (
                                <AnchoredPopover anchor={kindPicker.anchor} width={256} onClose={() => setKindPicker(null)}>
                                  <SetKindMenu current={kindOf(set)} onSelect={(k) => handleSetKind(we.id, set.id, k)} />
                                </AnchoredPopover>
                              )}

                              {/* Weight Input. text-base (16px) no solo se lee
                                  mejor: por debajo de 16px iOS hace zoom
                                  automático al enfocar el campo, lo que descoloca
                                  toda la pantalla en móvil. */}
                              <div className="min-w-0">
                                <DecimalInput
                                  value={set.weight}
                                  placeholder="0"
                                  onChange={(v) => handleUpdateWeightRep(we.id, set.id, 'weight', v)}
                                  className={`w-full text-center px-1.5 py-2 border rounded-lg text-base font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    set.completed ? 'bg-slate-950 border-emerald-900 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-200'
                                  }`}
                                />
                              </div>

                              {/* Reps Input */}
                              <div className="min-w-0">
                                <input
                                  type="number"
                                  min={1}
                                  inputMode="numeric"
                                  value={set.reps || ''}
                                  placeholder="10"
                                  onChange={(e) => handleUpdateWeightRep(we.id, set.id, 'reps', parseInt(e.target.value) || 0)}
                                  className={`w-full text-center px-1.5 py-2 border rounded-lg text-base font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    set.completed ? 'bg-slate-950 border-emerald-900 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-200'
                                  }`}
                                />
                              </div>

                              {/* RPE (el selector se ancla a la fila, no a esta celda estrecha) */}
                              <div className="flex justify-center">
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    setRpePicker(rpePicker?.setId === set.id ? null : { setId: set.id, anchor: e.currentTarget })
                                  }
                                  className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition cursor-pointer ${
                                    set.rpe ? 'text-slate-950' : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                  style={set.rpe ? { backgroundColor: rpeColor(set.rpe) } : undefined}
                                  title={set.rpe ? `RPE ${set.rpe}` : 'Añadir RPE'}
                                >
                                  {set.rpe ?? <Gauge className="h-4 w-4" />}
                                </button>

                                {rpePicker?.setId === set.id && (
                                  <AnchoredPopover anchor={rpePicker.anchor} align="right" width={248} onClose={() => setRpePicker(null)}>
                                    <div className="p-0.5">
                                      <p className="px-0.5 pb-1.5 text-[11px] leading-tight text-slate-400">
                                        RPE · reps que te quedaban en reserva
                                      </p>
                                      <div className="grid grid-cols-5 gap-1">
                                        {RPE_OPTIONS.map((opt) => (
                                          <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => handleUpdateRPE(we.id, set.id, opt.value)}
                                            className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-slate-950 cursor-pointer ${
                                              set.rpe === opt.value ? 'ring-2 ring-white' : ''
                                            }`}
                                            style={{ backgroundColor: rpeColor(opt.value) }}
                                          >
                                            <span className="text-base font-bold leading-none">{opt.value}</span>
                                            <span className="mt-1 text-[10px] font-semibold leading-none opacity-80">{opt.hint}</span>
                                          </button>
                                        ))}
                                      </div>
                                      {set.rpe && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateRPE(we.id, set.id, undefined)}
                                          className="w-full mt-2 py-1.5 rounded-lg text-xs font-bold text-slate-300 bg-slate-900 hover:bg-slate-950 cursor-pointer"
                                        >
                                          Quitar RPE
                                        </button>
                                      )}
                                    </div>
                                  </AnchoredPopover>
                                )}
                              </div>

                              {/* Completed Checkbox */}
                              <div className="flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSetComplete(we.id, set.id, ex.name, we.restTime)}
                                  className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                    set.completed
                                      ? 'bg-emerald-600 border border-emerald-500 text-white'
                                      : 'border border-slate-700 hover:border-slate-500 text-transparent bg-slate-950'
                                  }`}
                                >
                                  <Check className="h-4.5 w-4.5 stroke-[4px]" />
                                </button>
                              </div>

                              {/* Remove Set */}
                              <div className="flex justify-center">
                                <button
                                  type="button"
                                  disabled={we.sets.length <= 1}
                                  onClick={() => handleRemoveSet(we.id, set.id)}
                                  className="text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-slate-500 p-1.5 cursor-pointer"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => handleAddSet(we.id)}
                            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 pt-1.5 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" /> Añadir Serie
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Exercise / Action Button in current session */}
                <button
                  id="btn-add-exercise-active"
                  onClick={() => setShowAddExercise(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-900 hover:bg-slate-850 text-slate-200 font-bold text-sm rounded-2xl transition-colors cursor-pointer border border-dashed border-slate-800"
                >
                  <Plus className="h-4.5 w-4.5 text-blue-400" />
                  Agregar Ejercicio al Entrenamiento
                </button>
                {onUploadPhoto && onDeletePhoto && (
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                    <WorkoutPhotos
                      title={activeWorkout.routineName}
                      photos={photos}
                      onUpload={onUploadPhoto}
                      onDelete={onDeletePhoto}
                    />
                  </div>
                )}
                {routines.length > 0 && (
                  <button
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

      {/* MODAL: Select Exercise to add to Active Workout */}
      <AnimatePresence>
        {showAddExercise && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl max-w-6xl w-full overflow-hidden shadow-2xl border border-slate-800 max-h-[85dvh] flex flex-col"
            >
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100">Agregar Ejercicio al Entrenamiento</h3>
                <button
                  onClick={() => setShowAddExercise(false)}
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
                  onSelectExercise={handleAddExerciseToWorkout}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: añadir otra rutina a la sesión en curso */}
      <AnimatePresence>
        {showAddRoutine && (
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowAddRoutine(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-800 max-h-[85dvh] flex flex-col"
            >
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100">Añadir rutina a esta sesión</h3>
                <button
                  onClick={() => setShowAddRoutine(false)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-3 space-y-2 bg-slate-950">
                <p className="text-xs text-slate-400 px-1 pb-1">
                  Sus ejercicios se añaden al final, con los pesos de la última vez (o de tu regla de progresión).
                </p>
                {routines.map((routine) => (
                  <button
                    key={routine.id}
                    onClick={() => handleAddRoutineToWorkout(routine)}
                    className="w-full text-left p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/50 transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-sm text-slate-100">{routine.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {[routine.folder, routine.dayOfWeek, `${routine.exercises.length} ejercicios`].filter(Boolean).join(' · ')}
                    </div>
                  </button>
                ))}
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
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
