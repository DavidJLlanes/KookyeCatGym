import { useEffect, useState } from 'react';

/** Segundos transcurridos desde `startTime` (ISO), actualizados cada segundo. 0 si no hay inicio. */
export function useElapsedSeconds(startTime: string | undefined): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      return;
    }
    const startMs = new Date(startTime).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]); // solo el inicio: el objeto del entrenamiento se recrea en cada edición

  return elapsed;
}
