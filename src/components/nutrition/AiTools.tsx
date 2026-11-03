import { Sparkles } from 'lucide-react';
import { useAiAvailable } from '../../hooks/useNutritionAi';
import { dayTotals, remaining } from '../../utils/nutrition/totals';
import { NutritionTargets } from '../../utils/nutrition/energy';
import type { NutritionData } from '../../hooks/useNutritionData';
import EstimatePanel from './ai/EstimatePanel';
import RecipesPanel from './ai/RecipesPanel';
import PlanPanel from './ai/PlanPanel';
import AnalysisPanel from './ai/AnalysisPanel';

interface AiToolsProps {
  date: string;
  data: NutritionData;
  targets: NutritionTargets | null;
}

/** Herramientas de IA de Nutrición. Solo se activan si el servidor tiene una clave de IA. */
export default function AiTools({ date, data, targets }: AiToolsProps) {
  const configured = useAiAvailable();
  const left = targets ? remaining(targets, dayTotals(data.log[date])) : null;

  if (configured === null) return <p className="text-sm text-slate-500">Comprobando la IA…</p>;
  if (!configured) {
    return (
      <div id="ai-not-configured" className="bg-slate-900 p-5 rounded-3xl border border-slate-800 text-sm text-slate-400 space-y-2">
        <h2 className="font-black text-white flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-400" /> IA no disponible</h2>
        <p>Estas herramientas usan la misma clave de IA que el Coach. Un administrador puede configurarla en los ajustes del Coach IA. Mientras tanto, el resto de Nutrición funciona sin IA.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Las respuestas de la IA son estimaciones y pueden equivocarse: revísalas. No sustituyen el consejo de un profesional sanitario.</p>
      <RecipesPanel date={date} data={data} remaining={left} />
      <EstimatePanel date={date} data={data} />
      <PlanPanel targets={targets} />
      <AnalysisPanel data={data} targets={targets} />
    </div>
  );
}
