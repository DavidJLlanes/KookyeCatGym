import { useEffect } from 'react';

type WakeLockSentinelLike = { release?: () => Promise<void>; addEventListener?: (type: string, cb: () => void) => void };

/**
 * Mantiene la pantalla encendida mientras `active` sea true, para que los
 * temporizadores sigan corriendo sin tocar el móvil. El navegador libera el
 * bloqueo solo cada vez que la pestaña se oculta, así que se vuelve a pedir
 * al regresar.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let sentinel: WakeLockSentinelLike | null = null;

    const request = async () => {
      try {
        const wakeLock = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
        if (!wakeLock) return;
        const lock = await wakeLock.request('screen');
        if (cancelled) {
          lock.release?.().catch(() => {});
          return;
        }
        sentinel = lock;
        // Sin escuchar «release», la referencia seguiría apuntando a un bloqueo
        // ya muerto y nunca se volvería a pedir.
        lock.addEventListener?.('release', () => {
          if (sentinel === lock) sentinel = null;
        });
      } catch {
        // Algunos contextos lo deniegan (batería baja...): no es crítico
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled && !sentinel) void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      sentinel?.release?.().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
