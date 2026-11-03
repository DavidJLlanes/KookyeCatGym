import { useCallback, useEffect, useRef, useState } from 'react';
import { playTimerSound } from '../utils/timerSound';

/** Serie por tiempo (plancha, colgado...) que se está cronometrando. */
export interface HoldRun {
  weId: string;
  setId: string;
  exerciseName: string;
  /** Segundos que hay que aguantar. */
  targetSeconds: number;
}

export type HoldPhase = 'ready' | 'hold';

interface HoldTimerOptions {
  /** Cuenta atrás para colocarse antes de empezar a aguantar (0 = empieza ya). */
  readySeconds: number;
  /** Al terminar (o al parar antes de tiempo) con los segundos realmente aguantados. */
  onComplete: (run: HoldRun, heldSeconds: number) => void;
}

export interface HoldTimer {
  run: HoldRun | null;
  phase: HoldPhase;
  /** Segundos que quedan de la fase actual. */
  secondsLeft: number;
  start: (run: HoldRun) => void;
  /** En «preparados» salta directamente a aguantar; aguantando, termina ya. */
  advance: () => void;
  cancel: () => void;
}

interface Active {
  run: HoldRun;
  phase: HoldPhase;
  phaseEndsAt: number;
  holdStartedAt: number | null;
}

/**
 * Cronómetro de una serie por tiempo: una cuenta atrás corta para colocarse y
 * otra con el objetivo. Al llegar a cero suena el aviso y se completa la serie
 * sola. Usa horas absolutas, así que no se desvía si el navegador frena el intervalo.
 */
export function useHoldTimer({ readySeconds, onComplete }: HoldTimerOptions): HoldTimer {
  const [active, setActive] = useState<Active | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const activeRef = useRef<Active | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const set = useCallback((next: Active | null) => {
    activeRef.current = next;
    setActive(next);
  }, []);

  const beginHold = useCallback(
    (run: HoldRun, now: number) => {
      playTimerSound(1, 660);
      set({ run, phase: 'hold', phaseEndsAt: now + run.targetSeconds * 1000, holdStartedAt: now });
    },
    [set]
  );

  const start = useCallback(
    (run: HoldRun) => {
      const safe = { ...run, targetSeconds: Math.max(1, Math.round(run.targetSeconds)) };
      const now = Date.now();
      if (readySeconds <= 0) beginHold(safe, now);
      else set({ run: safe, phase: 'ready', phaseEndsAt: now + readySeconds * 1000, holdStartedAt: null });
    },
    [readySeconds, beginHold, set]
  );

  const finish = useCallback(
    (held: number) => {
      const current = activeRef.current;
      if (!current) return;
      set(null);
      onCompleteRef.current(current.run, held);
    },
    [set]
  );

  const advance = useCallback(() => {
    const current = activeRef.current;
    if (!current) return;
    if (current.phase === 'ready') {
      beginHold(current.run, Date.now());
    } else {
      const held = Math.round((Date.now() - (current.holdStartedAt ?? Date.now())) / 1000);
      finish(Math.max(1, held));
    }
  }, [beginHold, finish]);

  const cancel = useCallback(() => set(null), [set]);

  const running = active !== null;
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const current = activeRef.current;
      if (!current) return;
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((current.phaseEndsAt - now) / 1000));
      setSecondsLeft(remaining);
      if (remaining > 0) return;
      if (current.phase === 'ready') {
        beginHold(current.run, now);
      } else {
        playTimerSound(3);
        finish(current.run.targetSeconds);
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [running, beginHold, finish]);

  return { run: active?.run ?? null, phase: active?.phase ?? 'ready', secondsLeft, start, advance, cancel };
}
