import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, AlertTriangle, Settings, Loader2, ChevronDown, X } from 'lucide-react';
import * as api from '../api/client';
import { Exercise, WorkoutLog } from '../types';
import { ProgressionRule } from '../utils/progressionRules';
import { buildCoachSummary } from '../utils/coachSummary';
import CoachSettings from './CoachSettings';

interface AICoachPanelProps {
  logs: WorkoutLog[];
  exercises: Exercise[];
  progressionRules: ProgressionRule[];
}

const PRIORITY_STYLE: Record<string, string> = {
  alta: 'bg-red-950/40 text-red-300 border-red-500/30',
  media: 'bg-amber-950/40 text-amber-300 border-amber-500/30',
  baja: 'bg-sky-950/40 text-sky-300 border-sky-500/30',
};

// Fechas de SQLite en UTC sin zona
const runDate = (createdAt: string) => new Date(createdAt.replace(' ', 'T') + 'Z');

export default function AICoachPanel({ logs, exercises, progressionRules }: AICoachPanelProps) {
  const [status, setStatus] = useState<api.CoachStatus | null>(null);
  const [history, setHistory] = useState<api.CoachRun[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<api.CoachStatus | null>(null);

  const refresh = async () => {
    try {
      const [s, h] = await Promise.all([api.getCoachStatus(), api.getCoachHistory()]);
      setStatus(s);
      statusRef.current = s;
      setHistory(h);
      setLoadError(null);
      return h;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No se pudo cargar el Coach IA.');
      return null;
    }
  };

  // Mientras haya un análisis en curso se consulta cada pocos segundos, pero
  // nunca más allá del tiempo máximo configurado (+ margen): la app no se queda esperando.
  const pollWhilePending = (runs: api.CoachRun[] | null) => {
    if (pollRef.current) clearTimeout(pollRef.current);
    const pending = runs?.find((r) => r.status === 'pending');
    if (!pending) return;
    const limitMs = ((statusRef.current?.totalTimeoutSeconds ?? 120) + 30) * 1000;
    if (Date.now() - runDate(pending.createdAt).getTime() > limitMs) {
      setRequestError('El análisis superó el tiempo máximo de espera y se ha dejado de esperar.');
      api.cancelCoachRun(pending.id).finally(refresh);
      return;
    }
    pollRef.current = setTimeout(async () => pollWhilePending(await refresh()), 3000);
  };

  useEffect(() => {
    refresh().then(pollWhilePending);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingRun = history.find((r) => r.status === 'pending');

  // Contador de segundos mientras analiza
  useEffect(() => {
    if (!pendingRun) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pendingRun?.id]);

  const analyze = async () => {
    setRequestError(null);
    try {
      await api.requestCoachAnalysis(buildCoachSummary(logs, exercises, progressionRules));
      pollWhilePending(await refresh());
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'No se pudo pedir el análisis.');
      refresh();
    }
  };

  const cancel = async () => {
    if (!pendingRun) return;
    if (pollRef.current) clearTimeout(pollRef.current);
    await api.cancelCoachRun(pendingRun.id).catch(() => {});
    refresh();
  };

  const latest = history.find((r) => r.status !== 'pending');

  if (loadError) {
    return <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-sm text-red-400">{loadError}</div>;
  }
  if (!status) {
    return <div className="p-4 text-sm text-slate-500">Cargando…</div>;
  }

  const elapsed = pendingRun ? Math.max(0, Math.floor((now - runDate(pendingRun.createdAt).getTime()) / 1000)) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-400" />
        <h3 className="font-bold text-slate-200">Coach IA</h3>
        {status.isAdmin && (
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="ml-auto flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-200"
          >
            <Settings className="h-3.5 w-3.5" />
            Configuración
          </button>
        )}
      </div>

      {!status.configured && (
        <div className="p-4 rounded-lg border border-amber-500/40 bg-amber-950/30 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="text-sm text-amber-200 space-y-1">
            <p className="font-bold">El Coach IA no funciona sin una clave de API.</p>
            <p className="text-xs text-amber-200/80">
              Necesita al menos una conexión con un proveedor de IA (hay varios gratuitos, como OpenRouter, Gemini o Groq).{' '}
              {status.isAdmin ? 'Añádela en Configuración.' : 'Pide al administrador de KookyeCatGym que la configure.'}
            </p>
          </div>
        </div>
      )}

      {status.isAdmin && (showConfig || !status.configured) && (
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
          <CoachSettings onSaved={refresh} />
        </div>
      )}

      {status.configured && (
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
          <p className="text-xs text-slate-400">
            Analiza tus últimas 8 semanas (series por músculo, evolución de tus ejercicios principales, RPE y frecuencia) y te
            propone ajustes. Solo se envían cifras agregadas al proveedor de IA.
          </p>

          {pendingRun ? (
            <div className="space-y-2">
              <div className="w-full px-4 py-3 bg-purple-950/40 border border-purple-500/30 text-purple-200 rounded-lg font-bold flex items-center justify-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analizando… {elapsed} s
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Máximo {status.totalTimeoutSeconds} s. Puedes seguir usando la app.</span>
                <button onClick={cancel} className="flex items-center gap-1 text-slate-300 hover:text-white font-bold">
                  <X className="h-3.5 w-3.5" />
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={analyze}
              disabled={status.remainingToday === 0 || logs.length === 0}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 text-white rounded-lg font-bold flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Analizar mis entrenamientos
            </button>
          )}

          <div className="text-[11px] text-slate-500 text-center space-y-0.5">
            <div>
              {logs.length === 0
                ? 'Necesitas algún entrenamiento registrado.'
                : `Te quedan ${status.remainingToday} análisis en las próximas 24 h.`}
            </div>
            <div>
              Usará, por orden:{' '}
              {status.connections.map((c, i) => (
                <span key={i}>
                  {i > 0 && ' → '}
                  {c.providerName}
                  {c.free && <span className="text-emerald-400"> (gratis)</span>}
                </span>
              ))}
            </div>
          </div>
          {requestError && <div className="text-xs text-red-400">{requestError}</div>}
        </div>
      )}

      {latest && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400">
            Último análisis · {runDate(latest.createdAt).toLocaleString('es-ES')}
            {latest.result?.proveedor && (
              <span className="font-normal text-slate-500"> · {latest.result.proveedor} ({latest.result.modelo})</span>
            )}
          </div>
          {latest.status === 'error' ? (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-xs text-red-300 whitespace-pre-line">
              {latest.error?.split(' · ').join('\n')}
            </div>
          ) : (
            latest.result && (
              <>
                {latest.result.intentosFallidos && latest.result.intentosFallidos.length > 0 && (
                  <div className="text-[11px] text-amber-300/80">
                    Antes fallaron: {latest.result.intentosFallidos.join(' · ')}
                  </div>
                )}
                <div className="p-4 bg-purple-950/20 rounded-lg border border-purple-500/30 text-sm text-slate-200">
                  {latest.result.resumen}
                </div>
                {latest.result.sugerencias.map((s, i) => (
                  <div key={i} className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-100 text-sm">{s.titulo}</h4>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase shrink-0 ${PRIORITY_STYLE[s.prioridad] ?? ''}`}>
                        {s.prioridad}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{s.detalle}</p>
                    <span className="inline-block text-[10px] text-slate-500 uppercase tracking-wider">{s.categoria}</span>
                  </div>
                ))}
              </>
            )
          )}
        </div>
      )}

      {history.filter((r) => r !== latest && r.status === 'done').length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-400">Análisis anteriores</div>
          {history
            .filter((r) => r !== latest && r.status === 'done')
            .map((run) => (
              <div key={run.id} className="bg-slate-900 rounded-lg border border-slate-800">
                <button
                  onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                  className="w-full flex items-center justify-between p-3 text-xs text-slate-300"
                >
                  <span>
                    {runDate(run.createdAt).toLocaleString('es-ES')}
                    {run.result?.proveedor && <span className="text-slate-500"> · {run.result.proveedor}</span>}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedRun === run.id ? 'rotate-180' : ''}`} />
                </button>
                {expandedRun === run.id && run.result && (
                  <div className="px-3 pb-3 space-y-2 text-xs text-slate-300">
                    <p>{run.result.resumen}</p>
                    {run.result.sugerencias.map((s, i) => (
                      <p key={i}>
                        <span className="font-bold text-slate-100">{s.titulo}:</span> {s.detalle}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
