import React from 'react';
import { MuscleBalance, getBalanceRecommendation, getBalanceStatusColor } from '../utils/muscleBalance';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface MuscleBalanceReportProps {
  balances: MuscleBalance[];
  isEmpty?: boolean;
}

export default function MuscleBalanceReport({ balances, isEmpty = false }: MuscleBalanceReportProps) {
  if (isEmpty || balances.length === 0) {
    return (
      <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-sm text-slate-400 space-y-2">
        <p className="text-center">Aún no hay datos suficientes para comparar músculos.</p>
        <p className="text-xs text-slate-500">
          Se compara tu mejor serie de los últimos 6 meses en ejercicios con barra (press de banca, sentadilla, peso
          muerto, remo y press militar) y en máquina (curl femoral y extensión de cuádriceps). Registra al menos dos de
          ellos que formen pareja, por ejemplo press de banca y sentadilla.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {balances.map((balance, idx) => {
        const statusIcon =
          balance.status === 'balanced'
            ? CheckCircle
            : balance.status === 'warning'
              ? AlertTriangle
              : AlertCircle;
        const StatusIcon = statusIcon;
        const color = getBalanceStatusColor(balance.status);
        const recommendation = getBalanceRecommendation(balance);

        return (
          <div
            key={idx}
            className={`p-3 rounded-lg border-2 transition-colors ${
              balance.status === 'balanced'
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : balance.status === 'warning'
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : 'bg-red-950/20 border-red-500/30'
            }`}
          >
            {/* Header */}
            <div className="flex items-start gap-2 mb-2">
              <StatusIcon className="h-4 w-4 mt-0.5" style={{ color }} />
              <div className="flex-1">
                <div className="font-bold text-slate-200 text-sm">
                  {balance.muscle1} vs {balance.muscle2}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Ratio: {balance.ratio} ({balance.minRatio} - {balance.maxRatio} ideal)
                </div>
                <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                  <div>{balance.detail1}</div>
                  <div>{balance.detail2}</div>
                </div>
              </div>
            </div>

            {/* Ratio Bar */}
            <div className="mb-3">
              <div className="flex items-center gap-2">
                {/* Min marker */}
                <div className="text-[10px] text-slate-500">{balance.minRatio}</div>

                {/* Ratio bar */}
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.min(100, (balance.ratio / balance.maxRatio) * 100)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>

                {/* Max marker */}
                <div className="text-[10px] text-slate-500">{balance.maxRatio}</div>
              </div>
            </div>

            {/* Recommendation */}
            <div
              className="text-xs p-2 rounded bg-black/30 text-slate-300 italic"
              style={{ borderLeft: `3px solid ${color}` }}
            >
              {recommendation}
            </div>

            {/* Status Badge */}
            <div className="flex gap-2 mt-2 text-[10px] font-bold">
              <span
                className="px-2 py-1 rounded-full"
                style={{
                  backgroundColor: color,
                  color: 'white',
                }}
              >
                {balance.status === 'balanced' ? '✓ Equilibrado' : balance.status === 'warning' ? '⚠ Advertencia' : '✗ Crítico'}
              </span>
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="font-bold mb-2 text-slate-300">Interpretación:</div>
        <div>🟢 <strong>Equilibrado:</strong> Ratio dentro del rango ideal</div>
        <div>🟡 <strong>Advertencia:</strong> Ligeramente fuera del rango ideal</div>
        <div>🔴 <strong>Crítico:</strong> Desequilibrio importante - prioriza el más débil</div>
        <div className="pt-1 text-slate-500">Valores en kg = 1RM estimado de tu mejor serie (hasta 12 repeticiones, sin calentamiento) en los últimos 6 meses.</div>
      </div>

      {/* Tips */}
      <div className="p-3 bg-blue-950/20 rounded-lg border border-blue-500/30 text-xs text-blue-300">
        <strong className="block mb-1">💡 Tips:</strong>
        <ul className="space-y-1 text-blue-400 list-disc list-inside">
          <li>Equilibra push (pecho) y pull (espalda)</li>
          <li>Cuida el ratio superior/inferior</li>
          <li>Previene lesiones y mejora estética</li>
        </ul>
      </div>
    </div>
  );
}
