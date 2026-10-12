import React, { useState } from 'react';
import BODY_PATHS, { BodyView } from '../data/bodyPaths';
import {
  MuscleGroupStats,
  BODY_PART_GROUP,
  BODY_PART_LABEL,
  getStatusColor,
  formatRecoveryStatus,
  getIntensityRecommendation,
} from '../utils/muscleStats';

interface MuscleMapVisualProps {
  stats: Map<string, MuscleGroupStats>;
  load: Record<string, number>;
  selectedMuscle?: string;
  onMuscleClick?: (muscle: string) => void;
}

const INERT = ['head', 'hair', 'neck', 'hands', 'feet', 'knees', 'ankles'];

const ACCENT = '#3b82f6';
const MUSCLE_BASE = '#243044';
const SILHOUETTE = '#334155';
const SEAM = '#0f172a';

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v * t + pb[i] * (1 - t)).toString(16).padStart(2, '0')).join('');
}

export const LEVEL_FILL = [MUSCLE_BASE, mix(ACCENT, MUSCLE_BASE, 0.32), mix(ACCENT, MUSCLE_BASE, 0.56), mix(ACCENT, MUSCLE_BASE, 0.78), ACCENT];

const muscleGroups = ['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Abdomen', 'Piernas'];

export function levelOf(value: number, max: number): number {
  if (!value || max <= 0) return 0;
  return Math.max(1, Math.ceil((value / max) * 4));
}

// Silueta (frente o espalda) con los músculos coloreados por nivel. También la
// usan las fotos de progreso físico (BodyProgressSection) para filtrar por músculo.
export function BodySide({
  view,
  load,
  max,
  highlightGroup,
  onHover,
  onPick,
}: {
  view: BodyView;
  load: Record<string, number>;
  max: number;
  highlightGroup?: string | null;
  onHover: (part: string | null) => void;
  onPick: (part: string) => void;
}) {
  const parts = Object.keys(view.p);
  return (
    <svg viewBox={view.vb} className="h-auto w-full max-h-[340px]" role="group">
      {parts.filter((p) => INERT.includes(p)).map((part) =>
        view.p[part].map((d, i) => (
          <path key={part + i} d={d} fill={SILHOUETTE} stroke={SEAM} strokeWidth={2.5} strokeLinejoin="round" />
        ))
      )}
      {parts.filter((p) => !INERT.includes(p)).map((part) => {
        const selected = !!highlightGroup && BODY_PART_GROUP[part] === highlightGroup;
        return view.p[part].map((d, i) => (
          <path
            key={part + i}
            d={d}
            fill={LEVEL_FILL[levelOf(load[part], max)]}
            stroke={selected ? '#e2e8f0' : SEAM}
            strokeWidth={selected ? 6 : 2.5}
            strokeLinejoin="round"
            className="cursor-pointer transition-[fill] duration-300"
            onMouseEnter={() => onHover(part)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onPick(part)}
          >
            <title>{BODY_PART_LABEL[part] ?? part}</title>
          </path>
        ));
      })}
    </svg>
  );
}

export default function MuscleMapVisual({ stats, load, selectedMuscle, onMuscleClick }: MuscleMapVisualProps) {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const max = Math.max(0, ...Object.values(load));
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
          <BodySide view={BODY_PATHS.front} load={load} max={max} highlightGroup={displayMuscle} onHover={setHoveredPart} onPick={pick} />
          <BodySide view={BODY_PATHS.back} load={load} max={max} highlightGroup={displayMuscle} onHover={setHoveredPart} onPick={pick} />
        </div>

        <div className="h-5 mt-2 text-center text-xs text-slate-300">
          {hoveredPart && (
            <>
              <span className="font-bold">{BODY_PART_LABEL[hoveredPart] ?? hoveredPart}</span>
              <span className="text-slate-500"> · {load[hoveredPart] || 0} series</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px] text-slate-500">
          Menos
          {LEVEL_FILL.map((c) => (
            <span key={c} className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: c }} />
          ))}
          Más
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {muscleGroups.map((group) => {
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
