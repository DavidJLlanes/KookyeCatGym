import { useState } from 'react';
import { useNutritionAi } from '../../../hooks/useNutritionAi';
import { Macros } from '../../../utils/nutrition/types';
import AiShell from './AiShell';

/** Menú de varios días y lista de la compra según tus objetivos. */
export default function PlanPanel({ targets }: { targets: Macros | null }) {
  const { result, loading, error, run } = useNutritionAi('plan');
  const [days, setDays] = useState(7);
  const [notes, setNotes] = useState('');
  const copyShopping = () => result && navigator.clipboard?.writeText(result.compra.map((c) => `- ${c}`).join('\n')).catch(() => {});

  return (
    <AiShell id="ai-plan" title="Plan semanal y compra" description="Un menú de cuatro comidas al día ajustado a tus objetivos, con la lista de la compra." loading={loading} error={error} meta={result}>
      {!targets && <p className="text-xs text-amber-300">Primero calcula tus objetivos en la pestaña Objetivos.</p>}
      <div className="flex flex-wrap gap-2">
        <select aria-label="Días" value={days} onChange={(e) => setDays(Number(e.target.value))} className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100">
          {[1, 3, 5, 7].map((d) => <option key={d} value={d}>{d} {d === 1 ? 'día' : 'días'}</option>)}
        </select>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Preferencias (vegetariano, sin pescado, batch cooking…)" className="flex-1 min-w-[12rem] px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100" />
      </div>
      <button type="button" id="btn-ai-plan" disabled={loading || !targets} onClick={() => targets && run({ targets, days, notes })} className="btn btn-primary btn-sm disabled:opacity-40">Crear plan</button>
      {result && (
        <div className="space-y-3">
          {result.nota && <p className="text-xs text-slate-400">{result.nota}</p>}
          {result.dias.map((d) => (
            <div key={d.dia} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="text-xs font-black text-white mb-1">{d.dia} <span className="text-slate-500 font-normal">· {d.comidas.reduce((s, c) => s + c.kcal, 0)} kcal</span></div>
              <ul className="text-xs text-slate-300 space-y-0.5">
                {d.comidas.map((c, i) => <li key={i}><span className="text-slate-500 capitalize">{c.comida}:</span> {c.plato} <span className="text-slate-500">({c.kcal} kcal · P {c.proteina})</span></li>)}
              </ul>
            </div>
          ))}
          {result.compra.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-white">Lista de la compra</span>
                <button type="button" onClick={copyShopping} className="text-[11px] text-blue-300 cursor-pointer">Copiar</button>
              </div>
              <ul className="text-xs text-slate-300 columns-2 gap-4">{result.compra.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </AiShell>
  );
}
