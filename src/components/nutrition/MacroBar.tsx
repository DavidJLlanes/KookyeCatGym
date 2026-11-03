interface MacroBarProps {
  label: string;
  value: number;
  target: number | null;
  unit?: string;
  color: string; // clase de Tailwind de fondo
}

/** Barra de progreso de un macro frente a su objetivo (se pone roja al pasarse mucho). */
export default function MacroBar({ label, value, target, unit = 'g', color }: MacroBarProps) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const over = target ? value > target * 1.1 : false;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-bold text-slate-300">{label}</span>
        <span className="tabular-nums text-slate-400">
          <strong className={over ? 'text-rose-400' : 'text-slate-100'}>{Math.round(value)}</strong>
          {target ? ` / ${target}` : ''} {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemax={target ?? undefined}>
        <div className={`h-full rounded-full transition-all ${over ? 'bg-rose-500' : color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
