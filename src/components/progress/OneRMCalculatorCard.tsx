import React, { useState, useMemo} from 'react';
import { Calculator, Percent} from 'lucide-react';
import DecimalInput from '../DecimalInput';
import { formatEsNumber} from '../../utils/number';




/** Calculadora de 1RM (fórmula de Epley) con tabla de porcentajes. */
export default function OneRMCalculatorCard() {
  // Interactive 1RM Calculator state
  const [calcWeight, setCalcWeight] = useState<number>(80);
  const [calcReps, setCalcReps] = useState<number>(8);

  const calculated1RM = useMemo(() => {
    if (calcWeight <= 0 || calcReps <= 0) return 0;
    // Epley formula: 1RM = w * (1 + r / 30)
    return Math.round(calcWeight * (1 + calcReps / 30) * 10) / 10;
  }, [calcWeight, calcReps]);

  const percentageTable = useMemo(() => {
    const table = [];
    const base = calculated1RM;
    for (let pct = 100; pct >= 50; pct -= 5) {
      // Approximate reps based on percentage of 1RM (standard guidelines)
      let approxReps = 1;
      if (pct === 95) approxReps = 2;
      else if (pct === 90) approxReps = 4;
      else if (pct === 85) approxReps = 6;
      else if (pct === 80) approxReps = 8;
      else if (pct === 75) approxReps = 10;
      else if (pct === 70) approxReps = 12;
      else if (pct === 65) approxReps = 15;
      else if (pct === 60) approxReps = 20;
      else if (pct < 60) approxReps = 25;

      table.push({
        percentage: pct,
        weight: Math.round(base * (pct / 100) * 10) / 10,
        reps: approxReps,
      });
    }
    return table;
  }, [calculated1RM]);

  return (
    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-8">
      
      {/* Calc Inputs */}
      <div className="md:col-span-5 space-y-5 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-400" />
            Calculadora de One Rep Max (1RM)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Estima tu fuerza máxima teórica para una sola repetición basándote en tu mejor rendimiento de fuerza.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Peso Levantado (kg)</label>
              <DecimalInput
                id="calc-weight-input"
                value={calcWeight}
                onChange={(v) => setCalcWeight(v)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Repeticiones</label>
              <input
                id="calc-reps-input"
                type="number"
                min={1}
                max={30}
                value={calcReps}
                onChange={(e) => setCalcReps(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Display Big 1RM estimation */}
          <div className="bg-gradient-to-r from-blue-950/80 to-slate-950 p-5 rounded-2xl text-white text-center shadow-inner relative overflow-hidden border border-blue-500/20">
            <div className="absolute top-2 right-2 opacity-10">
              <Percent className="h-16 w-16" />
            </div>
            <div className="text-xs text-blue-300 font-bold uppercase tracking-widest">1RM Estimado Total</div>
            <div id="calc-1rm-result" className="text-3xl font-black mt-1 text-blue-400">{formatEsNumber(calculated1RM)} <span className="text-sm font-semibold">kg</span></div>
            <div className="text-[10px] text-slate-500 mt-2">Calculado utilizando la fórmula de Epley</div>
          </div>
        </div>
      </div>

      {/* Percentages Table */}
      <div className="md:col-span-7">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Distribución de Cargas por Porcentaje</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {percentageTable.map((row) => (
            <div key={row.percentage} className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-blue-400 block">{row.percentage}%</span>
                <span className="text-slate-500 text-[10px]">Aprox. {row.reps} {row.reps === 1 ? 'rep' : 'reps'}</span>
              </div>
              <div className="font-extrabold text-slate-300 text-sm">
                {formatEsNumber(row.weight)} kg
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
