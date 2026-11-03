import { useCallback, useEffect, useRef, useState } from 'react';
import { cancelRestPush, clearRestNotifications, scheduleRestPush } from '../utils/restPush';
import { playTimerSound } from '../utils/timerSound';

// Margen para avisar del fin de un descanso que terminó con la app en segundo
// plano: si al volver ha pasado menos de esto se avisa; si ha pasado más se
// descarta en silencio (evita pitidos por sorpresa al desbloquear el móvil).
const ALERT_GRACE_MS = 90 * 1000;

interface RestTimerOptions {
  /** true mientras hay un entrenamiento activo: gestiona las notificaciones pendientes. */
  active: boolean;
  /** Se llama una vez cuando el descanso termina a la vista (no si terminó hace rato). */
  onFinished?: () => void;
}

export interface RestTimer {
  /** Segundos que quedan, o null si no hay descanso en marcha. 0 = terminado. */
  secondsLeft: number | null;
  paused: boolean;
  exerciseName: string;
  start: (seconds: number, exerciseName: string) => void;
  adjust: (seconds: number) => void;
  togglePause: () => void;
  dismiss: () => void;
  /** Momento (ms) en que termina el descanso en marcha, para reprogramar su aviso. */
  endsAt: () => number | null;
}

/**
 * Descanso entre series. El fin se guarda como una hora absoluta y no restando
 * 1 en cada tick: así la cuenta es exacta aunque el navegador congele la
 * pestaña con la pantalla bloqueada, y al volver se recalcula sola.
 */
export function useRestTimer({ active, onFinished }: RestTimerOptions): RestTimer {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [exerciseName, setExerciseName] = useState('');

  const endsAtRef = useRef<number | null>(null); // null = sin descanso o en pausa
  const firedRef = useRef(false); // el aviso de fin solo suena una vez
  const pushClearedRef = useRef(false); // con la app a la vista, el aviso push se cancela justo antes del final
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const running = secondsLeft !== null;

  useEffect(() => {
    if (!running) return;

    const tick = () => {
      const endsAt = endsAtRef.current;
      if (endsAt === null) return; // en pausa
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);

      const visible = document.visibilityState === 'visible';
      if (remaining <= 1 && !pushClearedRef.current && visible) {
        pushClearedRef.current = true;
        cancelRestPush();
      }
      // Con la pantalla apagada ni el pitido ni la vibración se perciben; si
      // está oculta no se da por avisado: se decide al volver.
      if (remaining === 0 && !firedRef.current && visible) {
        firedRef.current = true;
        if (Date.now() - endsAt <= ALERT_GRACE_MS) {
          playTimerSound(3);
          onFinishedRef.current?.();
        }
      }
    };

    tick();
    const id = setInterval(tick, 500);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [running]);

  // Al terminar o cancelar el entrenamiento no debe llegar un aviso pendiente,
  // y al volver a la app sobra la notificación del descanso ya visto.
  useEffect(() => {
    if (!active) return;
    const onVisible = () => document.visibilityState === 'visible' && void clearRestNotifications();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      cancelRestPush();
    };
  }, [active]);

  const start = useCallback((seconds: number, name: string) => {
    endsAtRef.current = Date.now() + seconds * 1000;
    firedRef.current = false;
    pushClearedRef.current = false;
    scheduleRestPush(endsAtRef.current, name);
    setSecondsLeft(seconds);
    setPaused(false);
    setExerciseName(name);
  }, []);

  const dismiss = useCallback(() => {
    setSecondsLeft(null);
    endsAtRef.current = null;
    cancelRestPush();
  }, []);

  const adjust = useCallback(
    (seconds: number) => {
      if (endsAtRef.current !== null) {
        endsAtRef.current += seconds * 1000;
        pushClearedRef.current = false;
        if (endsAtRef.current > Date.now()) scheduleRestPush(endsAtRef.current, exerciseName);
      }
      setSecondsLeft((prev) => (prev === null ? null : Math.max(0, prev + seconds)));
    },
    [exerciseName]
  );

  const togglePause = useCallback(() => {
    if (!paused) {
      // Pausar: se congela; deja de avanzar la hora de fin
      endsAtRef.current = null;
      cancelRestPush();
    } else {
      // Reanudar: el fin se recalcula con lo que quedaba
      endsAtRef.current = Date.now() + (secondsLeft ?? 0) * 1000;
      pushClearedRef.current = false;
      scheduleRestPush(endsAtRef.current, exerciseName);
    }
    setPaused(!paused);
  }, [paused, secondsLeft, exerciseName]);

  const endsAt = useCallback(() => endsAtRef.current, []);

  return { secondsLeft, paused, exerciseName, start, adjust, togglePause, dismiss, endsAt };
}
