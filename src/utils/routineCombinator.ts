import { Routine, WorkoutExercise } from '../types';

export interface RoutineDay {
  dayOfWeek: string;
  routineIds: string[];
  customOrder?: number; // Permite cambiar el orden del día
}

export interface CombinedSession {
  day: string;
  routines: { id: string; name: string }[];
  exercises: (WorkoutExercise & { sourceRoutineId: string; sourceRoutineName: string })[];
  totalExercises: number;
  totalSets: number;
}

export interface MultiRoutineConfig {
  routines: RoutineDay[];
  lastModified: string;
}

/**
 * Combine exercises from multiple routines for a single session
 */
export function combineRoutines(
  routineIds: string[],
  allRoutines: Routine[]
): CombinedSession | null {
  const selectedRoutines = allRoutines.filter((r) => routineIds.includes(r.id));

  if (selectedRoutines.length === 0) return null;

  const exercises: (WorkoutExercise & {
    sourceRoutineId: string;
    sourceRoutineName: string;
  })[] = [];

  selectedRoutines.forEach((routine) => {
    routine.exercises.forEach((ex) => {
      exercises.push({
        ...ex,
        sourceRoutineId: routine.id,
        sourceRoutineName: routine.name,
      });
    });
  });

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return {
    day: selectedRoutines.map((r) => r.name).join(' + '),
    routines: selectedRoutines.map((r) => ({ id: r.id, name: r.name })),
    exercises,
    totalExercises: exercises.length,
    totalSets,
  };
}

/**
 * Get configuration for a day with multiple routines
 */
export function getDayConfiguration(
  dayOfWeek: string,
  config: MultiRoutineConfig
): RoutineDay | null {
  return config.routines.find((r) => r.dayOfWeek === dayOfWeek) || null;
}

/**
 * Add a routine to a specific day
 */
export function addRoutineToDay(
  dayOfWeek: string,
  routineId: string,
  config: MultiRoutineConfig
): MultiRoutineConfig {
  const existing = config.routines.find((r) => r.dayOfWeek === dayOfWeek);

  if (existing) {
    if (!existing.routineIds.includes(routineId)) {
      existing.routineIds.push(routineId);
    }
  } else {
    config.routines.push({
      dayOfWeek,
      routineIds: [routineId],
    });
  }

  return {
    ...config,
    lastModified: new Date().toISOString(),
  };
}

/**
 * Remove a routine from a specific day
 */
export function removeRoutineFromDay(
  dayOfWeek: string,
  routineId: string,
  config: MultiRoutineConfig
): MultiRoutineConfig {
  const dayIndex = config.routines.findIndex((r) => r.dayOfWeek === dayOfWeek);

  if (dayIndex >= 0) {
    const day = config.routines[dayIndex];
    day.routineIds = day.routineIds.filter((id) => id !== routineId);

    // Remove day if no routines left
    if (day.routineIds.length === 0) {
      config.routines.splice(dayIndex, 1);
    }
  }

  return {
    ...config,
    lastModified: new Date().toISOString(),
  };
}

/**
 * Move a routine to a different day
 */
export function moveRoutineToDay(
  fromDay: string,
  toDay: string,
  routineId: string,
  config: MultiRoutineConfig
): MultiRoutineConfig {
  // Remove from source day
  config = removeRoutineFromDay(fromDay, routineId, config);

  // Add to target day
  config = addRoutineToDay(toDay, routineId, config);

  return config;
}

/**
 * Reorder routines within a day
 */
export function reorderRoutinesInDay(
  dayOfWeek: string,
  routineIds: string[],
  config: MultiRoutineConfig
): MultiRoutineConfig {
  const day = config.routines.find((r) => r.dayOfWeek === dayOfWeek);

  if (day) {
    day.routineIds = routineIds;
  }

  return {
    ...config,
    lastModified: new Date().toISOString(),
  };
}

/**
 * Get summary of weekly configuration
 */
export function getWeeklySummary(
  config: MultiRoutineConfig,
  allRoutines: Routine[]
): {
  day: string;
  routineNames: string[];
  exerciseCount: number;
}[] {
  const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return weekDays
    .map((day) => {
      const dayConfig = config.routines.find((r) => r.dayOfWeek === day);
      if (!dayConfig) return null;

      const routines = allRoutines.filter((r) => dayConfig.routineIds.includes(r.id));
      const exerciseCount = routines.reduce((sum, r) => sum + r.exercises.length, 0);

      return {
        day,
        routineNames: routines.map((r) => r.name),
        exerciseCount,
      };
    })
    .filter((x) => x !== null) as any[];
}

/**
 * Export configuration to JSON
 */
export function exportConfig(config: MultiRoutineConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Import configuration from JSON
 */
export function importConfig(json: string): MultiRoutineConfig | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.routines && Array.isArray(parsed.routines)) {
      return {
        routines: parsed.routines,
        lastModified: new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}
