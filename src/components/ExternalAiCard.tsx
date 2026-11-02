import React, { useMemo, useState } from 'react';
import { Copy, Check, FileDown, ShieldCheck, MessageSquareText } from 'lucide-react';
import type { Exercise, WorkoutLog } from '../types';
import type { ProgressionRule } from '../utils/progressionRules';
import { useUserData } from '../context/UserDataContext';
import { buildAiExport } from '../utils/aiExport';

interface ExternalAiCardProps {
  logs: WorkoutLog[];
  exercises: Exercise[];
  progressionRules: ProgressionRule[];
}

/**
 * Consultar tu progreso con cualquier IA sin configurar nada: copia un texto con
 * las instrucciones y el resumen de tus últimas 8 semanas, y lo pegas en Claude,
 * ChatGPT, Gemini... Funciona aunque el Coach IA del servidor no esté configurado.
 */
export default function ExternalAiCard({ logs, exercises, progressionRules }: ExternalAiCardProps) {
  const { data } = useUserData();
  const [question, setQuestion] = useState('');
  const [includeBody, setIncludeBody] = useState(true);
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  const text = useMemo(
    () =>
      buildAiExport({
        logs,
        exercises,
        rules: progressionRules,
        bodyWeights: includeBody ? data['body-weights'] : [],
        goal: includeBody ? data['body-goal'] : null,
        question,
      }),
    [logs, exercises, progressionRules, includeBody, data, question]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('error');
    }
    setTimeout(() => setState('idle'), 3000);
  };

  const download = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen-para-ia-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 p-2 rounded-xl bg-violet-950/50 border border-violet-500/20 text-violet-300">
          <MessageSquareText className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-slate-100 text-sm">Consultar con otra IA</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Copia tu resumen y pégalo en Claude, ChatGPT, Gemini o la que uses. No hace falta configurar nada.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="ai-question" className="block text-[11px] font-bold text-slate-500 mb-1">Qué quieres saber (opcional)</label>
        <textarea
          id="ai-question"
          rows={2}
          value={question}
          maxLength={400}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ej. ¿Por qué estoy estancado en press de banca?"
          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-violet-500 rounded-xl text-sm text-slate-100 placeholder-slate-600 outline-none resize-none"
        />
      </div>

      <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
        <input type="checkbox" checked={includeBody} onChange={(e) => setIncludeBody(e.target.checked)} className="h-4 w-4 accent-violet-500" />
        Incluir mi peso corporal y mi objetivo{data['body-weights'].length === 0 ? ' (aún no has registrado ninguno)' : ''}
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="btn btn-primary">
          {state === 'copied' ? <Check /> : <Copy />}
          {state === 'copied' ? '¡Copiado!' : 'Copiar resumen'}
        </button>
        <button type="button" onClick={download} className="btn btn-secondary">
          <FileDown />
          Descargar .txt
        </button>
      </div>
      {state === 'error' && (
        <p role="alert" className="text-xs text-amber-300">No se pudo copiar automáticamente (el navegador lo ha bloqueado). Usa «Descargar .txt» y pega su contenido.</p>
      )}

      <details className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
        <summary className="cursor-pointer font-bold text-slate-300">Avanzado: que tu IA consulte tus datos sola</summary>
        <div className="mt-2 space-y-2 leading-relaxed">
          <p>
            Hay un servidor MCP de solo lectura (carpeta <code className="text-slate-200">mcp/</code> del proyecto) que deja a Claude Desktop o Claude Code consultar tu historial directamente, sin copiar nada. Se ejecuta en tu ordenador y lee una copia de <code className="text-slate-200">gym.db</code>.
          </p>
          <p className="break-all rounded-lg bg-slate-900 p-2 font-mono text-[10px] text-slate-300">
            claude mcp add zgym -- node "RUTA\mcp\zgym-mcp.mjs" --db "RUTA\gym.db" --user TuUsuario
          </p>
          <p>Los pasos completos están en <code className="text-slate-200">mcp/README.md</code>.</p>
        </div>
      </details>

      <p className="flex items-start gap-1.5 text-[11px] text-slate-500 leading-relaxed">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" aria-hidden="true" />
        El texto lleva solo cifras agregadas de tus últimas 8 semanas: sin tu nombre, correo ni el historial entero. Lo que pegues quedará en la IA que elijas.
      </p>
    </div>
  );
}
