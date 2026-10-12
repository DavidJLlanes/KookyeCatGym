import { WorkoutLog } from '../types';

export interface HeatmapDay {
  date: string; // ISO date
  volume: number; // total kg × reps for the day
  workoutCount: number;
  intensity: 'none' | 'low' | 'medium' | 'high' | 'very_high';
}

export interface HeatmapWeek {
  week: number;
  days: HeatmapDay[];
  totalVolume: number;
}

export interface HeatmapYear {
  year: number;
  weeks: HeatmapWeek[];
  totalVolume: number;
  maxDailyVolume: number;
  activeDays: number;
}

/**
 * Convert volume to intensity level (similar to GitHub contribution levels)
 */
export function getIntensityLevel(volume: number, maxVolume: number): HeatmapDay['intensity'] {
  if (volume === 0) return 'none';
  const percentage = (volume / maxVolume) * 100;
  if (percentage >= 75) return 'very_high';
  if (percentage >= 50) return 'high';
  if (percentage >= 25) return 'medium';
  return 'low';
}

// Fecha AAAA-MM-DD en la hora local del dispositivo (con toISOString un
// entrenamiento pasada la medianoche caía en el día anterior, por el desfase UTC)
function localDateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * Generate heatmap data for a year
 */
export function generateYearHeatmap(year: number, logs: WorkoutLog[]): HeatmapYear {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  // Create a map of date -> volume
  const volumeByDate = new Map<string, { volume: number; workoutCount: number }>();

  for (const log of logs) {
    const logDate = new Date(log.date);
    if (isNaN(logDate.getTime()) || logDate.getFullYear() !== year) continue;

    const dateStr = localDateKey(logDate);
    const existing = volumeByDate.get(dateStr) || { volume: 0, workoutCount: 0 };

    // Calculate volume for this workout
    let workoutVolume = 0;
    for (const exercise of log.exercises) {
      for (const set of exercise.sets) {
        if (set.completed) {
          workoutVolume += set.weight * set.reps;
        }
      }
    }

    volumeByDate.set(dateStr, {
      volume: existing.volume + workoutVolume,
      workoutCount: existing.workoutCount + 1,
    });
  }

  // Find max volume for intensity scaling
  let maxDailyVolume = 0;
  for (const { volume } of volumeByDate.values()) {
    maxDailyVolume = Math.max(maxDailyVolume, volume);
  }
  maxDailyVolume = Math.max(maxDailyVolume, 1); // Avoid division by zero

  // Build weeks
  const weeks: HeatmapWeek[] = [];
  let currentDate = new Date(startDate);
  let currentWeek: HeatmapDay[] = [];
  let weekVolume = 0;
  let activeDays = 0;
  let totalVolume = 0;

  while (currentDate <= endDate) {
    const dateStr = localDateKey(currentDate);
    const dayData = volumeByDate.get(dateStr);

    const day: HeatmapDay = {
      date: dateStr,
      volume: dayData?.volume || 0,
      workoutCount: dayData?.workoutCount || 0,
      // Un entrenamiento sin peso (dominadas, cardio…) también cuenta: mínimo "low"
      intensity: dayData ? (dayData.volume > 0 ? getIntensityLevel(dayData.volume, maxDailyVolume) : 'low') : 'none',
    };

    currentWeek.push(day);
    // Día activo = cualquier día con algún entrenamiento, haya peso o no
    if (day.workoutCount > 0) {
      activeDays++;
    }
    if (day.volume > 0) {
      weekVolume += day.volume;
      totalVolume += day.volume;
    }

    // Week ends on Sunday (or last day of year)
    if (currentDate.getDay() === 6 || dateStr === localDateKey(endDate)) {
      weeks.push({
        week: weeks.length + 1,
        days: currentWeek,
        totalVolume: weekVolume,
      });
      currentWeek = [];
      weekVolume = 0;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    year,
    weeks,
    totalVolume,
    maxDailyVolume,
    activeDays,
  };
}

/**
 * Get color for a day based on intensity
 */
export function getHeatmapColor(intensity: HeatmapDay['intensity'], isDark: boolean = true): string {
  const colors = {
    none: isDark ? '#1e293b' : '#f1f5f9',
    low: isDark ? '#0ea5e9' : '#bfdbfe',
    medium: isDark ? '#06b6d4' : '#67e8f9',
    high: isDark ? '#10b981' : '#6ee7b7',
    very_high: isDark ? '#f59e0b' : '#fbbf24',
  };
  return colors[intensity];
}

/**
 * Format volume for display
 */
export function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k`;
  }
  return `${volume}`;
}

/**
 * Get stats for the current year
 */
export function getYearStats(heatmap: HeatmapYear) {
  const avgDailyVolume = heatmap.activeDays > 0 ? Math.round(heatmap.totalVolume / heatmap.activeDays) : 0;
  const avgWeeklyVolume = heatmap.weeks.length > 0 ? Math.round(heatmap.totalVolume / heatmap.weeks.length) : 0;

  return {
    totalVolume: heatmap.totalVolume,
    activeDays: heatmap.activeDays,
    avgDailyVolume,
    avgWeeklyVolume,
    maxDailyVolume: heatmap.maxDailyVolume,
  };
}
