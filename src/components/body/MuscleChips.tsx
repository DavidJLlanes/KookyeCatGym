import type { ProgressMuscle } from '../../api/client';
import {
  PROGRESS_MUSCLES,
  MUSCLE_COLOR} from '../../utils/photoTools';

export default function MuscleChips({ value, onChange, counts }: { value: ProgressMuscle | null; onChange: (m: ProgressMuscle) => void; counts?: Record<string, number> }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {PROGRESS_MUSCLES.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
            value === m ? 'text-white border-transparent' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          style={value === m ? { backgroundColor: MUSCLE_COLOR[m] } : undefined}
        >
          {value !== m && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: MUSCLE_COLOR[m] }} />}
          {m}
          {counts && counts[m] > 0 && <span className="opacity-70 font-semibold">{counts[m]}</span>}
        </button>
      ))}
    </div>
  );
}

