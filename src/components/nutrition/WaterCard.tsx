import { Droplets, Minus, Plus } from 'lucide-react';

interface WaterCardProps {
  waterMl: number;
  goalMl: number;
  onAdd: (ml: number) => void;
}

/** Contador de agua del día. */
export default function WaterCard({ waterMl, goalMl, onAdd }: WaterCardProps) {
  const pct = Math.min(100, (waterMl / goalMl) * 100);
  return (
    <section id="nutrition-water" className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <Droplets className="h-4 w-4 text-sky-400" /> Agua
        </div>
        <div className="text-sm tabular-nums text-slate-400">
          <strong className="text-slate-100">{(waterMl / 1000).toFixed(2).replace('.', ',')}</strong> / {(goalMl / 1000).toFixed(1).replace('.', ',')} L
        </div>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-2">
        {[250, 500].map((ml) => (
          <button key={ml} type="button" onClick={() => onAdd(ml)} className="btn btn-secondary btn-sm">
            <Plus /> {ml} ml
          </button>
        ))}
        <button type="button" onClick={() => onAdd(-250)} disabled={waterMl === 0} aria-label="Quitar 250 ml" className="btn btn-secondary btn-sm disabled:opacity-40">
          <Minus /> 250 ml
        </button>
      </div>
    </section>
  );
}
