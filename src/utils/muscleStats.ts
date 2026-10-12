import { WorkoutLog, Exercise } from '../types';
import { detectMuscleZone, MuscleZone } from './muscleZone';

// Músculos de la silueta (bodyPaths.ts) que recibe cada zona de ejercicio.
const ZONE_TO_BODY: Record<MuscleZone, string[]> = {
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
};

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
      for (const part of ZONE_TO_BODY[detectMuscleZone(ex)]) {
        load[part] = (load[part] || 0) + sets;
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

export type MuscleGroup = 'Pecho' | 'Espalda' | 'Piernas' | 'Hombros' | 'Brazos' | 'Abdomen';

const MUSCLE_GROUPS: MuscleGroup[] = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Abdomen'];

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
          exerciseVolume += set.weight * set.reps;
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
