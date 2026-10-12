import React from 'react';

interface RPEInputProps {
  value?: number;
  onChange: (value?: number) => void;
}

const RPE_COLORS = {
  0: 'bg-gray-300',
  1: 'bg-blue-300',
  2: 'bg-blue-400',
  3: 'bg-blue-500',
  4: 'bg-green-400',
  5: 'bg-green-500',
  6: 'bg-yellow-400',
  7: 'bg-yellow-500',
  8: 'bg-orange-400',
  9: 'bg-orange-500',
  10: 'bg-red-500',
};

const RPE_LABELS = {
  0: 'No hecho',
  1: 'Muy fácil',
  2: 'Fácil',
  3: 'Moderado',
  4: 'Moderado-Duro',
  5: 'Intermedio',
  6: 'Duro',
  7: 'Muy duro',
  8: 'Casi máximo',
  9: 'Máximo',
  10: 'Máximo absoluto',
};

export default function RPEInput({ value, onChange }: RPEInputProps) {
  const numValue = value ?? 0;
  const colorClass = RPE_COLORS[numValue as keyof typeof RPE_COLORS] || 'bg-gray-300';
  const labelText = RPE_LABELS[numValue as keyof typeof RPE_LABELS] || 'RPE';

  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min="0"
        max="10"
        step="1"
        value={numValue}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          onChange(val === 0 ? undefined : val);
        }}
        className={`w-20 h-2 rounded cursor-pointer accent-blue-500`}
      />
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${colorClass}`}
      >
        {numValue}
      </span>
      <span className="text-xs text-slate-600 whitespace-nowrap">{labelText}</span>
    </div>
  );
}
