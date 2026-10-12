import React from 'react';
import { OneRMHistory, format1RM } from '../utils/oneRMEstimate';
import { TrendingUp } from 'lucide-react';

interface OneRMChartProps {
  data: OneRMHistory;
}

export default function OneRMChart({ data }: OneRMChartProps) {
  if (data.estimates.length === 0) {
    return <div className="text-slate-500 text-sm">Sin datos de 1RM</div>;
  }

  // Take last 12 data points for chart
  const chartData = data.estimates.slice(-12).reverse();
  const maxValue = Math.max(...chartData.map((e) => e.weight));
  const minValue = Math.min(...chartData.map((e) => e.weight));
  const range = maxValue - minValue || 1;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-200 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          1RM Estimado
        </h3>
        <span className="text-lg font-bold text-emerald-400">{data.current1RM}kg</span>
      </div>

      {/* Mini Chart */}
      <div className="flex items-end gap-1 h-24 bg-slate-950 p-3 rounded-lg border border-slate-800">
        {chartData.map((estimate, idx) => {
          const height = ((estimate.weight - minValue) / range) * 100;
          const isNewest = idx === chartData.length - 1;
          const isPeak = estimate.weight === data.maxHistorical1RM;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center justify-end group"
              title={`${estimate.weight}kg (${new Date(estimate.date).toLocaleDateString()})`}
            >
              <div
                className={`w-full transition-all rounded-t ${
                  isNewest
                    ? 'bg-emerald-500'
                    : isPeak
                      ? 'bg-yellow-500'
                      : 'bg-slate-700 hover:bg-slate-600'
                }`}
                style={{ height: `${Math.max(5, height)}%`, minHeight: '4px' }}
              />
              <div className="text-[9px] text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity truncate w-full text-center">
                {estimate.weight}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-slate-900 rounded border border-slate-800">
          <div className="text-slate-500">Mejor histórico</div>
          <div className="font-bold text-slate-200">{data.maxHistorical1RM}kg</div>
        </div>
        <div className="p-2 bg-slate-900 rounded border border-slate-800">
          <div className="text-slate-500">% del máximo</div>
          <div className={`font-bold ${data.maxPercentage >= 95 ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {data.maxPercentage}%
          </div>
        </div>
      </div>

      {/* Recent Performance */}
      <div className="p-2 bg-slate-900 rounded border border-slate-800 text-xs space-y-1">
        <div className="text-slate-500 font-bold mb-2">Últimas sesiones</div>
        {data.estimates.slice(0, 3).map((estimate, idx) => (
          <div key={idx} className="flex justify-between text-slate-400">
            <span className="text-[11px]">{new Date(estimate.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
            <span className="font-bold text-slate-200">{estimate.weight}kg</span>
            <span className="text-[10px]">{estimate.formula}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
