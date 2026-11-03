import { useRef, useState } from 'react';
import { ActiveWorkout } from '../types';
import * as api from '../api/client';

// Marca persistente: se activa cuando el borrado del active_workout en el
// servidor falla incluso tras reintentar (ver deleteActiveWorkoutWithRetry).
// Se comprueba al arrancar la app para intentar limpiarlo antes de mostrar
// como "activo" un entrenamiento que en realidad ya se dio por finalizado.
export const ACTIVE_WORKOUT_DELETE_PENDING_KEY = 'hevy_active_workout_delete_pending';

/**
 * Entrenamiento en curso: estado en pantalla + persistencia en el servidor
 * (con debounce) y borrado fiable al terminar o cancelar.
 */
export function useActiveWorkoutStore() {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);

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

  return { activeWorkout, setActiveWorkout, saveActiveWorkoutState, deleteActiveWorkoutWithRetry };
}

export type ActiveWorkoutStore = ReturnType<typeof useActiveWorkoutStore>;
