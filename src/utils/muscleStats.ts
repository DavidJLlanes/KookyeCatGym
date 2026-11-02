import { WorkoutLog, Exercise } from '../types';
import { detectMuscleZone, MuscleZone } from './muscleZone';
import { MUSCLE_GROUPS, type MuscleGroup } from '../data/exerciseMeta';
import { setVolume } from './holdSets';

export type { MuscleGroup };

// Músculos de la silueta (bodyPaths.ts) que recibe cada zona de ejercicio.
export const ZONE_TO_BODY: Record<MuscleZone, string[]> = {
  'upper-chest': ['chest'],
  'mid-chest': ['chest'],
  'lower-chest': ['chest'],
  'front-deltoid': ['deltoids'],
  'lateral-deltoid': ['deltoids'],
  'rear-deltoid': ['deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearm: ['forearm'],
  abs: ['abs'],
  obliques: ['obliques'],
  lats: ['upper-back'],
  'mid-back': ['upper-back', 'trapezius'],
  'lower-back': ['lower-back'],
  quadriceps: ['quadriceps'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves'],
  trapezius: ['trapezius'],
  serratus: ['serratus'],
  adductors: ['adductors'],
  // La silueta no tiene un trazo propio para los abductores: es el glúteo medio.
  abductors: ['gluteal'],
  neck: ['neck'],
  'full-body': [],
  cardio: [],
};

export const BODY_PART_GROUP: Record<string, MuscleGroup> = {
  chest: 'Pecho',
  deltoids: 'Hombros',
  biceps: 'Brazos',
  triceps: 'Brazos',
  forearm: 'Brazos',
  abs: 'Abdomen',
  obliques: 'Abdomen',
  serratus: 'Abdomen',
  'upper-back': 'Espalda',
  trapezius: 'Espalda',
  'lower-back': 'Espalda',
  quadriceps: 'Piernas',
  hamstring: 'Piernas',
  gluteal: 'Piernas',
  calves: 'Piernas',
  adductors: 'Piernas',
  tibialis: 'Piernas',
  'hip-flexors': 'Piernas',
  neck: 'Cuello',
};

export const BODY_PART_LABEL: Record<string, string> = {
  chest: 'Pecho',
  deltoids: 'Deltoides',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearm: 'Antebrazo',
  abs: 'Abdomen',
  obliques: 'Oblicuos',
  serratus: 'Serrato',
  'upper-back': 'Dorsales',
  trapezius: 'Trapecio',
  'lower-back': 'Zona lumbar',
  quadriceps: 'Cuádriceps',
  hamstring: 'Isquiotibiales',
  gluteal: 'Glúteos',
  calves: 'Gemelos',
  adductors: 'Aductores',
  tibialis: 'Tibial',
  'hip-flexors': 'Flexores de cadera',
  neck: 'Cuello',
};

// Las series de los músculos secundarios cuentan menos que las de los principales.
export const SECONDARY_WEIGHT = 0.5;

/**
 * Partes de la silueta que trabaja un ejercicio. El catálogo importado trae
 * sus músculos principales y secundarios; los ejercicios antiguos (o los
 * personalizados) se deducen de su zona, como siempre.
 */
export function bodyPartsOf(ex: Exercise): { primary: string[]; secondary: string[] } {
  const bp = ex.bodyParts;
  if (bp && (bp.primary.length > 0 || bp.secondary.length > 0)) return bp;
  return { primary: ZONE_TO_BODY[detectMuscleZone(ex)], secondary: [] };
}

/**
 * Series efectivas (completadas, sin calentamiento) por músculo de la silueta en
 * los últimos `daysLookback` días. Cuenta series y no kg×reps para que los
 * ejercicios de peso corporal también aparezcan.
 */
export function calculateBodyLoad(
  logs: WorkoutLog[],
  exercises: Exercise[],
  daysLookback: number | null = 14
): Record<string, number> {
  const cutoff = cutoffDate(daysLookback);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const load: Record<string, number> = {};

  for (const log of logs) {
    if (cutoff && new Date(log.date) < cutoff) continue;
    for (const we of log.exercises) {
      const ex = byId.get(we.exerciseId);
      if (!ex) continue;
      const sets = we.sets.filter((s) => s.completed && !s.isWarmup).length;
      if (sets === 0) continue;
      const { primary, secondary } = bodyPartsOf(ex);
      for (const part of primary) load[part] = (load[part] || 0) + sets;
      // Un músculo que ya es principal no suma además como secundario.
      for (const part of secondary) {
        if (!primary.includes(part)) load[part] = (load[part] || 0) + sets * SECONDARY_WEIGHT;
      }
    }
  }
  return load;
}

export interface MuscleGroupStats {
  group: string;
  totalVolume: number; // kg × reps
  exerciseCount: number;
  lastWorkoutDate?: string;
  daysSinceLastWorkout?: number;
  status: 'high' | 'medium' | 'low' | 'none';
}

function cutoffDate(daysLookback: number | null): Date | null {
  if (daysLookback === null) return null;
  const d = new Date();
  d.setDate(d.getDate() - daysLookback);
  return d;
}

/**
 * Calculate stats for each muscle group based on workout history
 */
export function calculateMuscleStats(
  logs: WorkoutLog[],
  exercises: Exercise[],
  daysLookback: number | null = 14
): Map<MuscleGroup, MuscleGroupStats> {
  const cutoff = cutoffDate(daysLookback);

  const stats = new Map<MuscleGroup, MuscleGroupStats>();

  // Initialize all muscle groups
  MUSCLE_GROUPS.forEach((group) => {
    stats.set(group, {
      group,
      totalVolume: 0,
      exerciseCount: 0,
      status: 'none',
    });
  });

  // Más reciente primero, para que lastWorkoutDate sea la última sesión
  const ordered = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const log of ordered) {
    if (cutoff && new Date(log.date) < cutoff) break;

    for (const exercise of log.exercises) {
      const ex = exercises.find((e) => e.id === exercise.exerciseId);
      if (!ex) continue;

      const group = ex.muscleGroup as MuscleGroup;
      const stat = stats.get(group);
      if (!stat) continue;

      // Calculate volume for completed sets
      let exerciseVolume = 0;
      let completedSets = 0;
      for (const set of exercise.sets) {
        if (set.completed) {
          exerciseVolume += setVolume(set.weight, set.reps, ex);
          completedSets += 1;
        }
      }

      if (completedSets > 0) {
        stat.totalVolume += exerciseVolume;
        stat.exerciseCount += 1;
        if (!stat.lastWorkoutDate) {
          stat.lastWorkoutDate = log.date;
        }
      }
    }
  }

  // Calculate recovery days and status
  const today = new Date();
  stats.forEach((stat) => {
    if (stat.lastWorkoutDate) {
      const lastDate = new Date(stat.lastWorkoutDate);
      stat.daysSinceLastWorkout = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Determine status based on volume
    if (stat.exerciseCount === 0) {
      stat.status = 'none';
    } else if (stat.totalVolume > 10000) {
      stat.status = 'high';
    } else if (stat.totalVolume > 5000) {
      stat.status = 'medium';
    } else {
      stat.status = 'low';
    }
  });

  return stats;
}

/**
 * Get color for a muscle group status
 */
export function getStatusColor(
  status: 'high' | 'medium' | 'low' | 'none',
  isDark: boolean = true
): string {
  const colors = {
    high: isDark ? '#ef4444' : '#fee2e2', // red
    medium: isDark ? '#eab308' : '#fef3c7', // yellow
    low: isDark ? '#64748b' : '#e2e8f0', // slate
    none: isDark ? '#334155' : '#f1f5f9', // lighter slate
  };
  return colors[status];
}

/**
 * Format recovery status text
 */
export function formatRecoveryStatus(daysSince?: number): string {
  if (daysSince === undefined) return 'Sin entrenamientos';
  if (daysSince === 0) return 'Hoy';
  if (daysSince === 1) return 'Ayer';
  if (daysSince < 7) return `Hace ${daysSince}d`;
  const weeks = Math.floor(daysSince / 7);
  return `Hace ${weeks}w`;
}

/**
 * Get intensity recommendation based on recovery
 */
export function getIntensityRecommendation(daysSince?: number): string {
  if (daysSince === undefined) return 'Entrenamiento pendiente';
  if (daysSince === 0) return 'Descanso recomendado';
  if (daysSince === 1) return 'Baja intensidad';
  if (daysSince < 3) return 'Intensidad moderada';
  return 'Puedes entrenar duro';
}

// ---------------------------------------------------------------------------
// Mapa muscular: recuperación y músculos sin entrenar
// ---------------------------------------------------------------------------

export interface PartStatus {
  /** 0 = nada que señalar; 1-4 = de menos a más intenso. */
  level: number;
  /** Texto corto para el aviso al pasar el cursor. */
  text: string;
}

const HOUR_MS = 60 * 60 * 1000;

interface PartLastSession {
  at: number; // ms de la última sesión que trabajó esa parte
  stimulus: number; // series efectivas (secundarios a media) de esa sesión
}

/** Última sesión de cada parte de la silueta y cuánto estímulo recibió en ella. */
function lastSessionByPart(logs: WorkoutLog[], exercises: Exercise[]): Map<string, PartLastSession> {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const last = new Map<string, PartLastSession>();

  for (const log of logs) {
    const at = new Date(log.date).getTime();
    if (!Number.isFinite(at)) continue;
    const inSession: Record<string, number> = {};
    for (const we of log.exercises) {
      const ex = byId.get(we.exerciseId);
      if (!ex) continue;
      const sets = we.sets.filter((s) => s.completed && !s.isWarmup).length;
      if (sets === 0) continue;
      const { primary, secondary } = bodyPartsOf(ex);
      for (const p of primary) inSession[p] = (inSession[p] || 0) + sets;
      for (const p of secondary) if (!primary.includes(p)) inSession[p] = (inSession[p] || 0) + sets * SECONDARY_WEIGHT;
    }
    for (const [part, stimulus] of Object.entries(inSession)) {
      const prev = last.get(part);
      if (!prev || at > prev.at) last.set(part, { at, stimulus });
    }
  }
  return last;
}

/**
 * Horas que tarda en recuperarse una parte tras una sesión: 44 h con una serie,
 * subiendo 8 h por serie efectiva hasta un tope de ~4 días (series 8+). Es una
 * regla práctica, no fisiología exacta: más series, más descanso.
 */
export function recoveryHoursFor(stimulus: number): number {
  return 36 + 8 * Math.min(Math.max(stimulus, 1), 8);
}

function formatHours(h: number): string {
  if (h < 24) return `${Math.max(1, Math.round(h))} h`;
  const d = Math.round(h / 24);
  return d === 1 ? '1 día' : `${d} días`;
}

/**
 * "Qué sigue recuperándose": para cada parte entrenada hace menos de su tiempo
 * de recuperación, un nivel 1-4 según lo que queda (4 = recién machacada).
 * Las partes ya recuperadas no aparecen en el resultado.
 */
export function calculateRecovery(logs: WorkoutLog[], exercises: Exercise[], now: number = Date.now()): Record<string, PartStatus> {
  const out: Record<string, PartStatus> = {};
  for (const [part, { at, stimulus }] of lastSessionByPart(logs, exercises)) {
    if (!(part in BODY_PART_GROUP)) continue;
    const total = recoveryHoursFor(stimulus);
    const elapsed = Math.max(0, (now - at) / HOUR_MS);
    const left = total - elapsed;
    if (left <= 0) continue;
    const fraction = left / total; // 1 = recién entrenada, 0 = recuperada
    out[part] = {
      level: Math.min(4, Math.max(1, Math.ceil(fraction * 4))),
      text: `se recupera en ~${formatHours(left)}`,
    };
  }
  return out;
}

export const UNTRAINED_WARN_DAYS = 7;

/**
 * "Qué se ha quedado sin entrenar": las partes que llevan una semana o más sin
 * trabajarse (o que nunca se han trabajado). Nivel 1 (7-13 días) a 4 (28+ o nunca).
 */
export function calculateUntrained(logs: WorkoutLog[], exercises: Exercise[], now: number = Date.now()): Record<string, PartStatus> {
  const last = lastSessionByPart(logs, exercises);
  const out: Record<string, PartStatus> = {};
  for (const part of Object.keys(BODY_PART_GROUP)) {
    const seen = last.get(part);
    if (!seen) {
      out[part] = { level: 4, text: 'sin entrenar nunca' };
      continue;
    }
    const days = Math.floor((now - seen.at) / (24 * HOUR_MS));
    if (days < UNTRAINED_WARN_DAYS) continue;
    out[part] = { level: Math.min(4, 1 + Math.floor((days - UNTRAINED_WARN_DAYS) / 7)), text: `hace ${days} días` };
  }
  return out;
}
