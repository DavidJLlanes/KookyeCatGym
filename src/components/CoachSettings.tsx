import React, { useEffect, useState } from 'react';
import { Lock, Plus, Trash2, ArrowUp, ArrowDown, Loader2, CheckCircle, AlertCircle, ExternalLink, Timer } from 'lucide-react';
import * as api from '../api/client';

interface Row {
  key: string; // identificador local de la fila
  id?: string; // id guardado en el servidor
  provider: string;
  model: string;
  enabled: boolean;
  apiKey: string; // clave nueva escrita (vacía = conservar la guardada)
  hasKey: boolean;
  keyHint: string;
  models?: { id: string; name: string; free: boolean }[];
  test?: { ok: boolean; message: string; ms?: number };
  busy?: 'test' | 'models';
}

const toRow = (c: api.CoachConnection): Row => ({
  key: c.id,
  id: c.id,
  provider: c.provider,
  model: c.model,
  enabled: c.enabled,
  apiKey: '',
  hasKey: c.hasKey,
  keyHint: c.keyHint,
});

export default function CoachSettings({ onSaved }: { onSaved: () => void }) {
  const [providers, setProviders] = useState<api.CoachProvider[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [timeoutSeconds, setTimeoutSeconds] = useState(45);
  const [totalTimeoutSeconds, setTotalTimeoutSeconds] = useState(120);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api.getCoachConfig().then((c) => {
      setProviders(c.providers);
      setRows(c.connections.map(toRow));
      setTimeoutSeconds(c.timeoutSeconds);
      setTotalTimeoutSeconds(c.totalTimeoutSeconds);
      setLoaded(true);
    }).catch((err) => setMessage({ ok: false, text: err?.message || 'No se pudo cargar la configuración' }));
  }, []);

  const providerOf = (id: string) => providers.find((p) => p.id === id);

  const update = (key: string, patch: Partial<Row>, markDirty = true) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    if (markDirty) {
      setDirty(true);
      setMessage(null);
    }
  };

  const move = (index: number, delta: number) => {
    setRows((prev) => {
      const next = [...prev];
      const [row] = next.splice(index, 1);
      next.splice(index + delta, 0, row);
      return next;
    });
    setDirty(true);
  };

  const addRow = () => {
    const p = providers.find((x) => x.id === 'openrouter') ?? providers[0];
    setRows((prev) => [
      ...prev,
      { key: `new-${Date.now()}`, provider: p.id, model: p.defaultModel, enabled: true, apiKey: '', hasKey: false, keyHint: '' },
    ]);
    setDirty(true);
  };

  // Para probar/cargar modelos sin guardar: con la clave nueva si se ha escrito, si no con la guardada
  const refFor = (r: Row) =>
    r.id && !r.apiKey && r.hasKey ? { connectionId: r.id, model: r.model } : { provider: r.provider, apiKey: r.apiKey, model: r.model };

  const canUseKey = (r: Row) => r.apiKey.trim() !== '' || (r.hasKey && !!r.id);

  const testRow = async (r: Row) => {
    update(r.key, { busy: 'test', test: undefined }, false);
    try {
      const res = await api.testCoachConnection(refFor(r));
      update(r.key, { busy: undefined, test: res }, false);
    } catch (err: any) {
      update(r.key, { busy: undefined, test: { ok: false, message: err?.message || 'Error' } }, false);
    }
  };

  const loadModels = async (r: Row) => {
    update(r.key, { busy: 'models' }, false);
    try {
      const models = await api.getCoachModels(refFor(r));
      update(r.key, { busy: undefined, models }, false);
    } catch (err: any) {
      update(r.key, { busy: undefined, test: { ok: false, message: err?.message || 'No se pudo cargar la lista' } }, false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.saveCoachConfig({
        connections: rows.map((r) => ({
          id: r.id,
          provider: r.provider,
          model: r.model.trim(),
          enabled: r.enabled,
          ...(r.apiKey.trim() ? { apiKey: r.apiKey.trim() } : {}),
        })),
        timeoutSeconds,
        totalTimeoutSeconds,
      });
      setRows(res.connections.map(toRow));
      setTimeoutSeconds(res.timeoutSeconds);
      setTotalTimeoutSeconds(res.totalTimeoutSeconds);
      setDirty(false);
      setMessage({ ok: true, text: 'Configuración guardada.' });
      onSaved();
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return message ? <div className="text-xs text-red-400">{message.text}</div> : <div className="text-xs text-slate-500">Cargando configuración…</div>;
  }

  const freeProviders = providers.filter((p) => p.free);
  const paidProviders = providers.filter((p) => !p.free);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-200">Conexiones de IA</h4>
        <p className="text-xs text-slate-400 mt-1">
          Se prueban en este orden: si una falla, se queda sin cupo gratuito o tarda demasiado, se usa la siguiente. Las
          claves se guardan solo en tu servidor.
        </p>
      </div>

      {rows.length === 0 && (
        <div className="p-3 rounded-lg border border-dashed border-slate-700 text-xs text-slate-400 text-center">
          Aún no hay ninguna. Añade al menos una (las de OpenRouter, Gemini o Groq son gratuitas).
        </div>
      )}

      {rows.map((r, index) => {
        const p = providerOf(r.provider);
        return (
          <div key={r.key} className={`p-3 rounded-xl border space-y-2.5 ${r.enabled ? 'bg-slate-950 border-slate-800' : 'bg-slate-950/50 border-slate-800/60 opacity-70'}`}>
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 shrink-0 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">{index + 1}</span>
              <select
                value={r.provider}
                onChange={(e) => {
                  const np = providerOf(e.target.value)!;
                  // Al cambiar de proveedor, la clave guardada ya no sirve
                  update(r.key, { provider: np.id, model: np.defaultModel, hasKey: false, keyHint: '', models: undefined, test: undefined });
                }}
                className="flex-1 min-w-0 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-base sm:text-sm"
              >
                <optgroup label="Con plan gratuito">
                  {freeProviders.map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </optgroup>
                <optgroup label="De pago">
                  {paidProviders.map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </optgroup>
              </select>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${p?.free ? 'bg-emerald-950/50 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>
                {p?.free ? 'Gratis' : 'De pago'}
              </span>
            </div>

            {p && (
              <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-2">
                <span>{p.note}</span>
                <a href={p.keyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-0.5">
                  Conseguir clave <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            <label className="block">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1"><Lock className="h-3 w-3" /> Clave de API</span>
              <input
                type="password"
                autoComplete="off"
                value={r.apiKey}
                onChange={(e) => update(r.key, { apiKey: e.target.value, test: undefined })}
                placeholder={r.hasKey ? `Guardada (${r.keyHint}). Escribe otra para cambiarla` : 'Pega aquí tu clave'}
                className="mt-1 w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-base sm:text-sm"
              />
            </label>

            <div>
              <span className="text-[11px] font-bold text-slate-400">Modelo</span>
              <div className="mt-1 flex gap-2">
                <input
                  value={r.model}
                  onChange={(e) => update(r.key, { model: e.target.value, test: undefined })}
                  className="flex-1 min-w-0 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-base sm:text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => loadModels(r)}
                  disabled={!canUseKey(r) || r.busy !== undefined}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-[11px] font-bold text-slate-200 whitespace-nowrap"
                >
                  {r.busy === 'models' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Cargar modelos'}
                </button>
              </div>
              {r.models && (
                <select
                  value=""
                  onChange={(e) => e.target.value && update(r.key, { model: e.target.value, test: undefined })}
                  className="mt-1.5 w-full px-2 py-1.5 bg-slate-900 border border-blue-600/50 rounded-lg text-slate-200 text-base sm:text-xs"
                >
                  <option value="">
                    Elegir de la lista ({r.models.length} modelos{r.provider === 'openrouter' ? `, ${r.models.filter((m) => m.free).length} gratis` : ''})
                  </option>
                  {r.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}{r.provider === 'openrouter' && m.free ? ' · gratis' : ''}
                    </option>
                  ))}
                </select>
              )}
              {!r.models && <p className="text-[10px] text-slate-500 mt-1">El modelo por defecto es una sugerencia: pulsa "Cargar modelos" para ver los disponibles con tu clave.</p>}
            </div>

            {r.test && (
              <div className={`flex items-start gap-1.5 text-[11px] ${r.test.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {r.test.ok ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                {r.test.message}{r.test.ms ? ` (${(r.test.ms / 1000).toFixed(1)} s)` : ''}
              </div>
            )}

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => testRow(r)}
                disabled={!canUseKey(r) || r.busy !== undefined}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg text-[11px] font-bold text-white flex items-center gap-1"
              >
                {r.busy === 'test' && <Loader2 className="h-3 w-3 animate-spin" />}
                Probar
              </button>
              <label className="flex items-center gap-1.5 px-2 text-[11px] font-bold text-slate-300 cursor-pointer">
                <input type="checkbox" checked={r.enabled} onChange={(e) => update(r.key, { enabled: e.target.checked })} className="h-3.5 w-3.5" />
                Activa
              </label>
              <div className="ml-auto flex gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} title="Subir" className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30">
                  <ArrowUp className="h-3.5 w-3.5 text-slate-300" />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1} title="Bajar" className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30">
                  <ArrowDown className="h-3.5 w-3.5 text-slate-300" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRows((prev) => prev.filter((x) => x.key !== r.key));
                    setDirty(true);
                  }}
                  title="Eliminar conexión"
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-300" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {rows.length < 10 && (
        <button
          type="button"
          onClick={addRow}
          className="w-full py-2.5 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5"
        >
          <Plus className="h-4 w-4 text-blue-400" />
          Añadir conexión
        </button>
      )}

      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5"><Timer className="h-3.5 w-3.5 text-blue-400" /> Tiempo máximo de espera</h4>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-slate-400">
            Por cada conexión (s)
            <input
              type="number"
              min={10}
              max={300}
              inputMode="numeric"
              value={timeoutSeconds}
              onChange={(e) => {
                setTimeoutSeconds(parseInt(e.target.value) || 0);
                setDirty(true);
              }}
              className="mt-1 w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-base sm:text-sm"
            />
          </label>
          <label className="text-[11px] text-slate-400">
            En total (s)
            <input
              type="number"
              min={15}
              max={600}
              inputMode="numeric"
              value={totalTimeoutSeconds}
              onChange={(e) => {
                setTotalTimeoutSeconds(parseInt(e.target.value) || 0);
                setDirty(true);
              }}
              className="mt-1 w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-base sm:text-sm"
            />
          </label>
        </div>
        <p className="text-[10px] text-slate-500">
          Si una conexión no responde a tiempo se pasa a la siguiente; al llegar al total se cancela y se avisa. El análisis va
          en segundo plano, así que la app nunca se queda bloqueada.
        </p>
      </div>

      {message && <div className={`text-xs ${message.ok ? 'text-emerald-400' : 'text-red-400'}`}>{message.text}</div>}

      <button
        type="button"
        onClick={save}
        disabled={saving || !dirty}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl text-sm font-bold text-white"
      >
        {saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Sin cambios'}
      </button>
    </div>
  );
}
