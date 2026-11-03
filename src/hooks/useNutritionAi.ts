import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/client';
import type { AiTask, AiTaskMap } from '../utils/nutrition/ai';

/** ¿Hay una clave de IA configurada en el servidor? (null mientras se comprueba) */
export function useAiAvailable() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    api.getCoachStatus().then((s) => alive && setConfigured(s.configured)).catch(() => alive && setConfigured(false));
    return () => { alive = false; };
  }, []);
  return configured;
}

/** Lanza una tarea de IA de Nutrición y guarda su resultado, estado de carga y error. */
export function useNutritionAi<T extends AiTask>(task: T) {
  const [result, setResult] = useState<AiTaskMap[T]['result'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const run = useCallback(async (input: AiTaskMap[T]['input']) => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.askNutritionAi(task, input);
      if (id === seq.current) setResult(res);
    } catch (err) {
      if (id === seq.current) setError(err instanceof Error ? err.message : 'No se pudo completar la petición.');
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [task]);

  const reset = useCallback(() => { seq.current++; setResult(null); setError(null); setLoading(false); }, []);
  return { result, loading, error, run, reset };
}
