import React, { useMemo, useState } from 'react';
import BODY_PATHS from '../../data/bodyPaths';
import { MUSCLE_GROUPS } from '../../data/exerciseMeta';
import {
  MuscleGroupStats,
  BODY_PART_GROUP,
  BODY_PART_LABEL,
  getStatusColor,
  formatRecoveryStatus,
  getIntensityRecommendation,
  PartStatus,
} from '../../utils/muscleStats';
import { BodySide } from './BodyFigure';
import { LEVEL_FILL, RECOVERY_FILL, UNTRAINED_FILL } from './bodyPalette';

export type MapMode = 'volume' | 'recovery' | 'untrained';

interface MuscleMapVisualProps {
  stats: Map<string, MuscleGroupStats>;
  load: Record<string, number>;
  selectedMuscle?: string;
  onMuscleClick?: (muscle: string) => void;
  // Qué enseña el mapa: dónde fue el volumen (por defecto), qué sigue
  // recuperándose o qué se ha quedado sin entrenar.
  mode?: MapMode;
  // Para 'recovery' y 'untrained': nivel 1-4 y texto de cada parte.
  partStatus?: Record<string, PartStatus>;
}

export default function MuscleMapVisual({ stats, load, selectedMuscle, onMuscleClick, mode = 'volume', partStatus }: MuscleMapVisualProps) {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  // En recuperación y sin entrenar el "volumen" de cada parte es su nivel 1-4.
  const statusLoad = useMemo(() => Object.fromEntries(Object.entries(partStatus ?? {}).map(([p, s]) => [p, s.level])), [partStatus]);
  const shownLoad = mode === 'volume' ? load : statusLoad;
  const fills = mode === 'recovery' ? RECOVERY_FILL : mode === 'untrained' ? UNTRAINED_FILL : LEVEL_FILL;
  const max = mode === 'volume' ? Math.max(0, ...Object.values(load)) : 4;
  const hoverPartGroup = hoveredPart ? BODY_PART_GROUP[hoveredPart] : null;
  const displayMuscle = hoveredGroup || hoverPartGroup || selectedMuscle;
  const displayStat = displayMuscle ? stats.get(displayMuscle) : null;

  const pick = (part: string) => {
    const group = BODY_PART_GROUP[part];
    if (group) onMuscleClick?.(group);
  };

  return (
    <div className="space-y-4">
      <div className="relative p-4 bg-slate-900 rounded-lg border border-slate-800">
        <div className="flex gap-2 justify-center">
          <BodySide view={BODY_PATHS.front} load={shownLoad} max={max} fills={fills} highlightGroup={displayMuscle} onHover={setHoveredPart} onPick={pick} />
          <BodySide view={BODY_PATHS.back} load={shownLoad} max={max} fills={fills} highlightGroup={displayMuscle} onHover={setHoveredPart} onPick={pick} />
        </div>

        <div className="h-5 mt-2 text-center text-xs text-slate-300">
          {hoveredPart && (
            <>
              <span className="font-bold">{BODY_PART_LABEL[hoveredPart] ?? hoveredPart}</span>
              <span className="text-slate-500">
                {' · '}
                {mode === 'volume'
                  ? `${Math.round((load[hoveredPart] || 0) * 10) / 10} series`
                  : partStatus?.[hoveredPart]?.text ?? (mode === 'recovery' ? 'recuperado' : 'al día')}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px] text-slate-500">
          {mode === 'volume' ? 'Menos' : mode === 'recovery' ? 'Recuperado' : 'Al día'}
          {fills.map((c) => (
            <span key={c} className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: c }} />
          ))}
          {mode === 'volume' ? 'Más' : mode === 'recovery' ? 'Recién entrenado' : 'Más tiempo sin entrenar'}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {MUSCLE_GROUPS.map((group) => {
          const stat = stats.get(group);
          if (!stat) return null;
          const isSelected = displayMuscle === group;
          return (
            <button
              key={group}
              onClick={() => onMuscleClick?.(group)}
              onMouseEnter={() => setHoveredGroup(group)}
              onMouseLeave={() => setHoveredGroup(null)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                isSelected ? 'border-blue-500 bg-blue-950/30' : 'border-slate-700 hover:border-slate-600 bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor(stat.status) }} />
                <span className="text-xs font-bold text-slate-300">{group}</span>
              </div>
              <div className="text-xs text-slate-400">
                {stat.exerciseCount > 0 ? (
                  <>
                    <div className="font-bold text-slate-200">{Math.round(stat.totalVolume / 1000)}k vol</div>
                    <div className="text-[10px]">{stat.exerciseCount} ejercicios</div>
                  </>
                ) : (
                  <div className="text-slate-500 italic">Sin datos</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {displayStat && (
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
          <h3 className="font-bold text-slate-200">{displayMuscle}</h3>
          <div className="text-sm space-y-1 text-slate-400">
            <div>
              <span className="text-slate-500">Volumen total:</span>
              <span className="ml-2 font-bold text-slate-200">{Math.round(displayStat.totalVolume / 1000)}k kg×reps</span>
            </div>
            <div>
              <span className="text-slate-500">Ejercicios:</span>
              <span className="ml-2 font-bold text-slate-200">{displayStat.exerciseCount}</span>
            </div>
            {displayStat.daysSinceLastWorkout !== undefined && (
              <>
                <div>
                  <span className="text-slate-500">Último entrenamiento:</span>
                  <span className="ml-2 font-bold text-slate-200">{formatRecoveryStatus(displayStat.daysSinceLastWorkout)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Recomendación:</span>
                  <span className="ml-2 italic text-blue-400">{getIntensityRecommendation(displayStat.daysSinceLastWorkout)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
