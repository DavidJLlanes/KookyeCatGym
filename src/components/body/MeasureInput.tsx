import {
  MeasureUnit} from '../../utils/photoTools';

export default function MeasureInput({ value, onChange, unit, onUnit }: { value: string; onChange: (v: string) => void; unit: MeasureUnit; onUnit: (u: MeasureUnit) => void }) {
  return (
    <div className="flex gap-1.5">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={unit === 'cm' ? 'Ej. 38,5' : 'Ej. 385'}
        className="flex-1 min-w-0 px-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
      />
      <div className="flex p-1 bg-slate-950 border border-slate-700 rounded-xl">
        {(['cm', 'mm'] as MeasureUnit[]).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => onUnit(u)}
            className={`px-2.5 rounded-lg text-xs font-bold cursor-pointer ${unit === u ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  );
}

