import { useMemo } from 'react';
import { useNutritionAi } from '../../../hooks/useNutritionAi';
import { lastDays } from '../../../utils/nutrition/totals';
import { Macros } from '../../../utils/nutrition/types';
import { localDayKey } from '../../../utils/userData';
import type { NutritionData } from '../../../hooks/useNutritionData';
import AiShell from './AiShell';

/** Valoración de tu última semana de registro frente al objetivo. */
export default function AnalysisPanel({ data, targets }: { data: NutritionData; targets: Macros | null }) {
  const { result, loading, error, run } = useNutritionAi('analysis');
  const week = useMemo(() => lastDays(data.log, localDayKey(), 7), [data.log]);
  const logged = week.filter((d) => d.logged).length;

  return (
    <AiShell id="ai-analysis" title="Analizar mi semana" description="La IA revisa tus últimos 7 días frente a tu objetivo y señala patrones." loading={loading} error={error} meta={result}>
      {!targets && <p className="text-xs text-amber-300">Primero calcula tus objetivos en la pestaña Objetivos.</p>}
      {logged < 3 && targets && <p className="text-xs text-slate-500">Solo tienes {logged} {logged === 1 ? 'día registrado' : 'días registrados'}: el análisis será poco fiable.</p>}
      <button type="button" id="btn-ai-analysis" disabled={loading || !targets || logged === 0} onClick={() => targets && run({ targets, week })} className="btn btn-primary btn-sm disabled:opacity-40">Analizar</button>
      {result && (
        <div className="space-y-2">
          <p className="text-sm text-slate-200">{result.resumen}</p>
          {result.sugerencias.map((s, i) => (
            <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="text-xs font-black text-white">{s.titulo}</div>
              <p className="text-xs text-slate-400">{s.detalle}</p>
            </div>
          ))}
        </div>
      )}
    </AiShell>
  );
}
