import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import * as api from '../api/client';
import { USER_DATA_DEFAULTS, UserDataKey, UserDataShape, sanitizeUserData } from '../utils/userData';

interface UserDataContextValue {
  data: UserDataShape;
  /** false hasta que llega la primera respuesta (del servidor o de la caché). */
  ready: boolean;
  setValue: <K extends UserDataKey>(key: K, value: UserDataShape[K]) => void;
}

const UserDataContext = createContext<UserDataContextValue | null>(null);

const cacheKey = (userId: string) => `zgym-user-data-${userId}`;

function readCache(userId: string): UserDataShape | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    return raw ? sanitizeUserData(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCache(userId: string, data: UserDataShape) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(data));
  } catch {
    // sin espacio o almacenamiento bloqueado: la app sigue funcionando
  }
}

export function UserDataProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [data, setData] = useState<UserDataShape>(() => readCache(userId) ?? USER_DATA_DEFAULTS);
  const [ready, setReady] = useState(false);
  // Claves modificadas mientras la carga inicial seguía en curso: no deben ser
  // pisadas por lo que devuelva el servidor.
  const dirty = useRef(new Set<UserDataKey>());

  useEffect(() => {
    let cancelled = false;
    api
      .getUserData()
      .then((remote) => {
        if (cancelled) return;
        const clean = sanitizeUserData(remote);
        setData((local) => {
          const merged = { ...clean };
          for (const k of dirty.current) (merged as any)[k] = local[k];
          writeCache(userId, merged);
          return merged;
        });
      })
      .catch(() => {
        // Sin servidor (o endpoint aún sin desplegar): se usa la caché local.
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setValue = useCallback(
    <K extends UserDataKey>(key: K, value: UserDataShape[K]) => {
      dirty.current.add(key);
      setData((prev) => {
        const next = { ...prev, [key]: value };
        writeCache(userId, next);
        return next;
      });
      api.saveUserData(key, value).catch((err) => console.error(`No se pudo guardar "${key}" en el servidor`, err));
    },
    [userId]
  );

  const ctx = useMemo(() => ({ data, ready, setValue }), [data, ready, setValue]);
  return <UserDataContext.Provider value={ctx}>{children}</UserDataContext.Provider>;
}

export function useUserData(): UserDataContextValue {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error('useUserData debe usarse dentro de UserDataProvider');
  return ctx;
}
