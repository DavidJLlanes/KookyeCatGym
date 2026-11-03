import { useState } from 'react';
import { Calculator, Check } from 'lucide-react';
import { useUserData } from '../../context/UserDataContext';
import { localDayKey } from '../../utils/userData';
import { ACTIVITY_LABEL, GOAL_DEFAULT_ADJUST, dailyTargets } from '../../utils/nutrition/energy';
import { ActivityLevel, DEFAULT_PROFILE, NutritionGoal, NutritionProfile } from '../../utils/nutrition/types';
import { latestWeightKg } from '../../hooks/useNutritionTargets';

interface TargetsPanelProps {
  profile: NutritionProfile | null;
  onSave: (profile: NutritionProfile) => void;
}

const GOALS: { id: NutritionGoal; label: string }[] = [
  { id: 'lose', label: 'Perder grasa' },
  { id: 'hold', label: 'Mantener' },
  { id: 'gain', label: 'Ganar músculo' },
];
const input = 'w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500';
const label = 'block space-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider';
const toNum = (v: string) => Number(v.replace(',', '.'));

/** Datos personales y cálculo de los objetivos de calorías y macros. */
export default function TargetsPanel({ profile, onSave }: TargetsPanelProps) {
  const { data, setValue } = useUserData();
  const start = profile ?? DEFAULT_PROFILE;
  const savedWeight = latestWeightKg(data['body-weights']);
  const [draft, setDraft] = useState(start);
  const [weight, setWeight] = useState(savedWeight ? String(savedWeight).replace('.', ',') : '');
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof NutritionProfile>(k: K, v: NutritionProfile[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setSaved(false);
  };
  const w = toNum(weight);
  const weightOk = w >= 30 && w <= 300;
  const trainingPreview = weightOk ? dailyTargets(draft, w, true) : null;

  const save = () => {
    if (!weightOk) return;
    onSave(draft);
    // El peso se guarda también en el historial de peso corporal (un valor por día)
    const today = localDayKey();
    if (savedWeight !== w) {
      const rest = data['body-weights'].filter((e) => e.date !== today);
      setValue('body-weights', [...rest, { date: today, kg: w }].sort((a, b) => a.date.localeCompare(b.date)));
    }
    setSaved(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-black text-white text-base flex items-center gap-2"><Calculator className="h-4 w-4 text-blue-400" /> Objetivos</h2>
        <p className="text-xs text-slate-500">Estimaciones con la ecuación de Mifflin-St Jeor. Son orientativas, no un consejo médico ni dietético.</p>
      </div>

      <section className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className={label}>
            Sexo
            <select value={draft.sex} onChange={(e) => set('sex', e.target.value as 'male' | 'female')} className={input}>
              <option value="male">Hombre</option>
              <option value="female">Mujer</option>
            </select>
          </label>
          <label className={label}>
            Edad
            <input inputMode="numeric" value={draft.age} onChange={(e) => set('age', toNum(e.target.value) || 0)} className={input} />
          </label>
          <label className={label}>
            Altura (cm)
            <input inputMode="numeric" value={draft.heightCm} onChange={(e) => set('heightCm', toNum(e.target.value) || 0)} className={input} />
          </label>
          <label className={label}>
            Peso (kg)
            <input id="nutrition-weight" inputMode="decimal" value={weight} onChange={(e) => { setWeight(e.target.value); setSaved(false); }} className={input} placeholder="75" />
          </label>
        </div>
        <label className={label}>
          Actividad
          <select value={draft.activity} onChange={(e) => set('activity', e.target.value as ActivityLevel)} className={input}>
            {(Object.keys(ACTIVITY_LABEL) as ActivityLevel[]).map((a) => (
              <option key={a} value={a}>{ACTIVITY_LABEL[a]}</option>
            ))}
          </select>
        </label>
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Objetivo</div>
          <div className="grid grid-cols-3 gap-2">
            {GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  set('goal', g.id);
                  set('adjustPercent', GOAL_DEFAULT_ADJUST[g.id]);
                }}
                className={`py-2 rounded-lg text-xs font-bold border cursor-pointer ${draft.goal === g.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className={label}>
            Ajuste de calorías (%)
            <input inputMode="numeric" value={draft.adjustPercent} onChange={(e) => set('adjustPercent', toNum(e.target.value) || 0)} className={input} />
          </label>
          <label className={label}>
            Proteína (g/kg)
            <input inputMode="decimal" value={String(draft.proteinPerKg).replace('.', ',')} onChange={(e) => set('proteinPerKg', toNum(e.target.value) || 0)} className={input} />
          </label>
          <label className={label}>
            Grasa (% kcal)
            <input inputMode="numeric" value={draft.fatPercent} onChange={(e) => set('fatPercent', toNum(e.target.value) || 0)} className={input} />
          </label>
          <label className={label}>
            Días sin entreno (kcal)
            <input inputMode="numeric" value={draft.restDayKcalDelta} onChange={(e) => set('restDayKcalDelta', toNum(e.target.value) || 0)} className={input} />
          </label>
        </div>
        <label className={label}>
          Agua diaria (ml)
          <input inputMode="numeric" value={draft.waterGoalMl} onChange={(e) => set('waterGoalMl', toNum(e.target.value) || 0)} className={input} />
        </label>
      </section>

      {trainingPreview && (
        <section id="nutrition-targets-result" className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Metabolismo basal</div>
              <div className="text-lg font-black text-white tabular-nums">{trainingPreview.bmr} kcal</div>
            </div>
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gasto diario estimado</div>
              <div className="text-lg font-black text-white tabular-nums">{trainingPreview.tdee} kcal</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {([['Calorías', trainingPreview.kcal, ''], ['Proteína', trainingPreview.protein, ' g'], ['Hidratos', trainingPreview.carbs, ' g'], ['Grasa', trainingPreview.fat, ' g']] as const).map(([l, v, u]) => (
              <div key={l}>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{l}</div>
                <div className="text-base font-black text-blue-300 tabular-nums">{v}{u}</div>
              </div>
            ))}
          </div>
          {trainingPreview.clampedToBmr && (
            <p className="text-xs text-amber-300">El déficit pedido bajaba de tu metabolismo basal, así que el objetivo se ha subido a ese mínimo.</p>
          )}
        </section>
      )}

      <div className="flex items-center gap-3">
        <button type="button" id="btn-save-targets" onClick={save} disabled={!weightOk} className="btn btn-primary disabled:opacity-40">Guardar objetivos</button>
        {!weightOk && <span className="text-xs text-slate-500">Escribe tu peso (30-300 kg) para calcular.</span>}
        {saved && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Guardado</span>}
      </div>
    </div>
  );
}
