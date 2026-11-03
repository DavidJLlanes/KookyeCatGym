import { useCallback, useState } from 'react';

/**
 * Ajuste de interfaz que se recuerda en este dispositivo (localStorage). El
 * almacenamiento puede estar bloqueado o lleno: la app sigue funcionando sin él.
 * `parse` valida lo guardado; si devuelve undefined se usa `fallback`.
 */
export function useLocalPref<T>(
  key: string,
  fallback: T,
  parse: (raw: string) => T | undefined
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : parse(raw) ?? fallback;
    } catch {
      return fallback;
    }
  });

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, String(next));
      } catch {
        // sin espacio o bloqueado: el valor solo dura esta sesión
      }
    },
    [key]
  );

  return [value, update];
}

export const parseBool = (raw: string): boolean => raw !== 'false';

export const parseIntInRange =
  (min: number, max: number) =>
  (raw: string): number | undefined => {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
  };
