import React, { useCallback, useEffect, useState } from 'react';
import { Fingerprint, Trash2, Check } from 'lucide-react';
import * as api from '../api/client';
import {
  biometricLabel,
  isPasskeyAvailable,
  markPasskeyOfferDone,
  preparePasskeyRegistration,
  registerPasskey,
} from '../utils/passkey';

// Reto de alta pedido por adelantado (ver utils/passkey.ts) y renovado antes de
// que caduque en el servidor (5 min).
function usePreparedRegistration(enabled: boolean) {
  const [options, setOptions] = useState<api.PasskeyRegisterOptions | null>(null);
  const refresh = useCallback(() => {
    preparePasskeyRegistration().then(setOptions).catch(() => setOptions(null));
  }, []);
  useEffect(() => {
    if (!enabled) return;
    refresh();
    const timer = window.setInterval(refresh, 240_000);
    return () => window.clearInterval(timer);
  }, [enabled, refresh]);
  return { options, refresh };
}

/** Oferta tras entrar con contraseña: "¿Entrar con Face ID / huella la próxima vez?" */
export function PasskeyOffer({ userId, onDone }: { userId: string; onDone: () => void }) {
  const { options, refresh } = usePreparedRegistration(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const label = biometricLabel();

  const finish = () => {
    markPasskeyOfferDone(userId);
    onDone();
  };

  const activate = async () => {
    if (!options) return;
    setBusy(true);
    setError('');
    try {
      await registerPasskey(options);
      setDone(true);
      markPasskeyOfferDone(userId);
      window.setTimeout(onDone, 1200);
    } catch (err: any) {
      setError(err.message);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
        {done ? <Check className="h-7 w-7 text-emerald-400" /> : <Fingerprint className="h-7 w-7 text-blue-400" />}
      </div>
      <div className="space-y-1.5">
        <h2 className="text-white font-bold text-lg">{done ? '¡Listo!' : `Entra con ${label}`}</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          {done
            ? `La próxima vez podrás entrar con ${label}, sin escribir la contraseña.`
            : 'Activa el inicio con cara o huella en este dispositivo y entra sin escribir la contraseña. Tu cara o huella nunca salen del dispositivo.'}
        </p>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!done && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={activate}
            disabled={busy || !options}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors cursor-pointer"
          >
            <Fingerprint className="h-4.5 w-4.5" />
            {busy ? 'Esperando…' : `Activar ${label}`}
          </button>
          <button
            type="button"
            onClick={finish}
            className="w-full py-2.5 text-slate-400 hover:text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
          >
            Ahora no
          </button>
        </div>
      )}
    </div>
  );
}

const formatDate = (value: string | null) =>
  value ? new Date(value.replace(' ', 'T') + 'Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'nunca';

/** Sección de la ventana "Copia de Seguridad": dispositivos con cara/huella activada. */
export default function PasskeySection() {
  const [available, setAvailable] = useState(false);
  const [list, setList] = useState<api.PasskeyInfo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { options, refresh } = usePreparedRegistration(available);
  const label = biometricLabel();

  const load = useCallback(() => {
    api.getPasskeys().then(setList).catch(() => setList([]));
  }, []);

  useEffect(() => {
    isPasskeyAvailable().then(setAvailable);
    load();
  }, [load]);

  const activate = async () => {
    if (!options) return;
    setBusy(true);
    setError('');
    try {
      await registerPasskey(options);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      refresh();
      setBusy(false);
    }
  };

  const remove = async (passkey: api.PasskeyInfo) => {
    if (!window.confirm(`¿Quitar el inicio con cara/huella de "${passkey.name}"? En ese dispositivo tendrás que entrar con la contraseña.`)) return;
    try {
      await api.deletePasskey(passkey.id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="border-t border-slate-800 pt-5 space-y-3">
      <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
        <Fingerprint className="h-4 w-4 text-blue-400" />
        Entrar con cara o huella
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        Entra con Face ID, Touch ID o la huella en lugar de la contraseña. La contraseña sigue funcionando siempre.
      </p>

      {list && list.length > 0 && (
        <div className="space-y-2">
          {list.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl">
              <Fingerprint className="h-4 w-4 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-bold text-slate-200 truncate">{p.name}</div>
                <div className="text-[11px] text-slate-500">
                  Activado el {formatDate(p.created_at)} · último uso: {formatDate(p.last_used_at)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(p)}
                title="Quitar"
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {available ? (
        <button
          type="button"
          onClick={activate}
          disabled={busy || !options}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
        >
          <Fingerprint className="h-4 w-4" />
          {busy ? 'Esperando…' : `Activar ${label} en este dispositivo`}
        </button>
      ) : (
        <p className="text-[11px] text-slate-500">Este navegador o dispositivo no admite el inicio con cara o huella.</p>
      )}
    </div>
  );
}
