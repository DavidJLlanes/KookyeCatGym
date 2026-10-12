import React, { useState } from 'react';
import {
  ProgressionRule,
  ProgressionType,
  PROGRESSION_TYPE_LABEL,
  defaultProgressionRule,
  describeProgression,
  validateProgressionRule,
} from '../utils/progressionRules';
import { WorkoutSet } from '../types';
import { Plus, Trash2, Edit2 } from 'lucide-react';

interface ProgressionRulesPanelProps {
  exerciseId: string;
  exerciseName: string;
  rule?: ProgressionRule;
  lastSets: WorkoutSet[] | null;
  nextSets: WorkoutSet[] | null;
  onSave: (rule: ProgressionRule) => Promise<void>;
  onDelete: (exerciseId: string) => Promise<void>;
}

// Series de trabajo como "80 kg × 10 · 80 kg × 9" (el calentamiento no progresa, no se muestra)
const formatSets = (sets: WorkoutSet[]) =>
  sets
    .filter((s) => !s.isWarmup)
    .map((s) => (s.weight > 0 ? `${s.weight} kg × ${s.reps}` : `${s.reps} reps`))
    .join(' · ');

export default function ProgressionRulesPanel({
  exerciseId,
  exerciseName,
  rule,
  lastSets,
  nextSets,
  onSave,
  onDelete,
}: ProgressionRulesPanelProps) {
  const [draft, setDraft] = useState<ProgressionRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!draft) return;
    const errors = validateProgressionRule(draft);
    if (errors.length > 0) {
      setError(errors.join('. '));
      return;
    }
    run(() => onSave(draft));
  };

  if (draft) {
    return (
      <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
        <h4 className="font-bold text-slate-200 text-sm">{exerciseName}</h4>

        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">Tipo de Progresión</label>
          <select
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value as ProgressionType })}
            className="w-full px-2 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs"
          >
            {(Object.keys(PROGRESSION_TYPE_LABEL) as ProgressionType[]).map((t) => (
              <option key={t} value={t}>
                {PROGRESSION_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-xs font-bold text-slate-400">Regla activa</span>
        </label>

        {(draft.type === 'linear' || draft.type === 'double_progression') && (
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Incremento de Peso (kg)</label>
            <input
              type="number"
              step="0.5"
              inputMode="decimal"
              value={draft.weightIncrement ?? ''}
              onChange={(e) => setDraft({ ...draft, weightIncrement: parseFloat(e.target.value) || 0 })}
              className="w-full px-2 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200 text-base"
            />
          </div>
        )}

        {draft.type === 'double_progression' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Reps Objetivo</label>
              <input
                type="number"
                inputMode="numeric"
                value={draft.targetReps ?? ''}
                onChange={(e) => setDraft({ ...draft, targetReps: parseInt(e.target.value) || 0 })}
                className="w-full px-2 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200 text-base"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Incremento de Reps</label>
              <input
                type="number"
                inputMode="numeric"
                value={draft.repIncrement ?? ''}
                onChange={(e) => setDraft({ ...draft, repIncrement: parseInt(e.target.value) || 0 })}
                className="w-full px-2 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200 text-base"
              />
            </div>
          </div>
        )}

        {error && <div className="text-xs text-red-400">{error}</div>}

        <div className="flex gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-xs font-bold transition"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            onClick={() => {
              setDraft(null);
              setError(null);
            }}
            disabled={saving}
            className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (!rule) {
    return (
      <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
        <div className="text-xs text-slate-400">
          <span className="font-bold text-slate-200">{exerciseName}</span> no tiene regla de progresión.
        </div>
        <button
          onClick={() => setDraft(defaultProgressionRule(exerciseId))}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Crear regla
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-bold text-slate-200 text-sm">{exerciseName}</h4>
          <p className="text-xs text-slate-400 mt-1">{describeProgression(rule)}</p>
        </div>
        <span className={`text-xs font-bold whitespace-nowrap ${rule.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
          {rule.enabled ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      {rule.enabled && lastSets && nextSets && (
        <div className="text-xs space-y-1 p-3 bg-slate-950 rounded border border-slate-800">
          <div className="text-slate-500">
            Última vez: <span className="text-slate-300">{formatSets(lastSets)}</span>
          </div>
          <div className="text-slate-500">
            Próxima sesión: <span className="font-bold text-emerald-400">{formatSets(nextSets)}</span>
          </div>
          <div className="text-[10px] text-slate-500 pt-1">
            Se rellena automáticamente al empezar una rutina con este ejercicio.
          </div>
        </div>
      )}

      {error && <div className="text-xs text-red-400">{error}</div>}

      <div className="flex gap-2 pt-3 border-t border-slate-800">
        <button
          onClick={() => setDraft({ ...rule })}
          disabled={saving}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1"
        >
          <Edit2 className="h-3 w-3" />
          Editar
        </button>
        <button
          onClick={() => run(() => onDelete(exerciseId))}
          disabled={saving}
          className="flex-1 px-3 py-2 bg-red-950/40 hover:bg-red-900/40 text-red-400 rounded text-xs font-bold transition flex items-center justify-center gap-1"
        >
          <Trash2 className="h-3 w-3" />
          Eliminar
        </button>
      </div>
    </div>
  );
}
