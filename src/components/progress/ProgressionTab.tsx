import React, { useMemo} from 'react';
import { motion } from 'motion/react';
import { WorkoutLog, Exercise } from '../../types';
import { ProgressionRule, prefillWithProgression } from '../../utils/progressionRules';
import { getLastPerformanceSets } from '../../utils/lastPerformance';
import ProgressionRulesPanel from '../ProgressionRulesPanel';


interface ProgressionTabProps {
  logs: WorkoutLog[];
  exercises: Exercise[];
  progressionRules: ProgressionRule[];
  selectedExId: string;
  setSelectedExId: (id: string) => void;
  completedExerciseIds: string[];
  onSaveProgressionRule: (rule: ProgressionRule) => Promise<void>;
  onDeleteProgressionRule: (exerciseId: string) => Promise<void>;
}

/** Reglas de progresión automática por ejercicio, con vista previa de la próxima sesión. */
export default function ProgressionTab({
  logs, exercises, progressionRules, selectedExId, setSelectedExId, completedExerciseIds,
  onSaveProgressionRule, onDeleteProgressionRule,
}: ProgressionTabProps) {
  // Regla de progresión del ejercicio seleccionado y vista previa de la próxima sesión
  const selectedRule = useMemo(
    () => progressionRules.find((r) => r.exerciseId === selectedExId),
    [progressionRules, selectedExId]
  );
  const selectedLastSets = useMemo(() => getLastPerformanceSets(selectedExId, logs), [selectedExId, logs]);
  const selectedNextSets = useMemo(
    () => (selectedLastSets ? prefillWithProgression(selectedLastSets, selectedLastSets, selectedRule) : null),
    [selectedLastSets, selectedRule]
  );


  return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
          <label className="block text-xs font-bold text-slate-400 mb-2">Selecciona ejercicio</label>
          <select
            value={selectedExId}
            onChange={(e) => setSelectedExId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm"
          >
            {completedExerciseIds.map((exId) => {
              const ex = exercises.find((e) => e.id === exId);
              return (
                <option key={exId} value={exId}>
                  {ex?.name}
                </option>
              );
            })}
          </select>
        </div>

        {selectedExId && (
          <ProgressionRulesPanel
            key={selectedExId}
            exerciseId={selectedExId}
            exerciseName={exercises.find((e) => e.id === selectedExId)?.name || ''}
            rule={selectedRule}
            lastSets={selectedLastSets}
            nextSets={selectedNextSets}
            onSave={onSaveProgressionRule}
            onDelete={onDeleteProgressionRule}
          />
        )}

        <div className="p-4 bg-blue-950/20 rounded-lg border border-blue-500/30 text-xs text-blue-300 space-y-2">
          <strong>💡 Tipos de Progresión:</strong>
          <ul className="space-y-1 list-disc list-inside text-blue-400">
            <li><strong>Lineal:</strong> Suma peso cada sesión (+2.5kg)</li>
            <li><strong>Greyskull LP:</strong> Aumenta reps primero, luego peso</li>
            <li><strong>Doble Progresión:</strong> Aumenta reps hasta objetivo, luego peso</li>
          </ul>
        </div>
      </motion.div>
  );
}
