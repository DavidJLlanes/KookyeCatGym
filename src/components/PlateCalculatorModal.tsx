import React, { useState } from 'react';
import { X, Calculator } from 'lucide-react';
import { calculatePlates, formatPlateResult, PlateResult } from '../utils/plateMath';

interface PlateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWeight: (weight: number) => void;
}

export default function PlateCalculatorModal({ isOpen, onClose, onSelectWeight }: PlateCalculatorModalProps) {
  const [targetWeight, setTargetWeight] = useState(60);
  const [barWeight, setBarWeight] = useState(20);
  const [result, setResult] = useState<PlateResult | null>(null);

  if (!isOpen) return null;

  const handleCalculate = () => {
    const res = calculatePlates(targetWeight, { barWeight });
    setResult(res);
  };

  const handleSelectWeight = () => {
    if (result?.success) {
      onSelectWeight(result.totalWeight);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            <h2 className="font-semibold">Calculadora de Discos</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Bar Weight Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de barra</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setBarWeight(20)}
                className={`p-2 rounded text-sm font-medium transition ${
                  barWeight === 20
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Olímpica (20kg)
              </button>
              <button
                onClick={() => setBarWeight(15)}
                className={`p-2 rounded text-sm font-medium transition ${
                  barWeight === 15
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                EZ-Bar (15kg)
              </button>
              <button
                onClick={() => setBarWeight(10)}
                className={`p-2 rounded text-sm font-medium transition ${
                  barWeight === 10
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Corta (10kg)
              </button>
            </div>
          </div>

          {/* Target Weight */}
          <div>
            <label className="block text-sm font-medium mb-2">Peso total deseado (kg)</label>
            <input
              type="number"
              value={targetWeight}
              onChange={(e) => setTargetWeight(Math.max(barWeight, parseInt(e.target.value) || barWeight))}
              className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:border-slate-600"
              step="2.5"
              min={barWeight}
            />
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-sm font-medium mb-2">Presets comunes</label>
            <div className="grid grid-cols-4 gap-1">
              {[40, 60, 80, 100, 120, 140, 160, 180].map((w) => (
                <button
                  key={w}
                  onClick={() => setTargetWeight(w)}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    targetWeight === w
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {w}kg
                </button>
              ))}
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            className="w-full py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600 transition"
          >
            Calcular
          </button>

          {/* Result */}
          {result && (
            <div
              className={`p-3 rounded ${
                result.success
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              {result.success ? (
                <>
                  <p className="text-sm font-semibold mb-2">
                    {result.perSide}kg por lado:
                  </p>
                  <p className="text-sm mb-3">{formatPlateResult(result)}</p>
                  <button
                    onClick={handleSelectWeight}
                    className="w-full py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition"
                  >
                    Usar este peso
                  </button>
                </>
              ) : (
                <p className="text-sm text-red-700 dark:text-red-300">{result.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="p-4 border-t dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 border rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
