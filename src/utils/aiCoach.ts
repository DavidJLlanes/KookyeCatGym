import { WorkoutLog, Routine, Exercise } from '../types';

export type AIProvider = 'anthropic' | 'openai' | 'gemini';

export interface AICoachConfig {
  provider: AIProvider;
  apiKey?: string; // Encrypted locally
  model?: string;
  enabled: boolean;
  lastModified: string;
}

export interface CoachSuggestion {
  id: string;
  date: string;
  type: 'routine_analysis' | 'progression' | 'balance' | 'recovery';
  exerciseName?: string;
  title: string;
  suggestion: string;
  reasoning: string;
  priority: 'low' | 'medium' | 'high';
  applied?: boolean;
  appliedAt?: string;
}

export interface CoachAnalysis {
  workoutSummary: {
    totalVolume: number;
    totalSets: number;
    averageRPE?: number;
    exerciseCount: number;
    duration: number; // seconds
  };
  muscleBalance: {
    balanced: boolean;
    weakPoints: string[];
    strongPoints: string[];
  };
  progression: {
    trend: 'improving' | 'stagnant' | 'declining';
    lastWeekVolume: number;
    averageWeeklyVolume: number;
  };
  recovery: {
    lastRestDays: number;
    recommendedRest: number;
  };
}

/**
 * Prepare data for AI Coach analysis
 */
export function prepareCoachData(
  logs: WorkoutLog[],
  exercises: Exercise[],
  routines: Routine[],
  recentDays: number = 30
): CoachAnalysis {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - recentDays);

  const recentLogs = logs.filter((log) => new Date(log.date) >= cutoffDate);

  // Workout Summary
  let totalVolume = 0;
  let totalSets = 0;
  let rpeValues: number[] = [];
  let exerciseCount = 0;
  let totalDuration = 0;

  recentLogs.forEach((log) => {
    totalDuration += log.duration;
    log.exercises.forEach((ex) => {
      exerciseCount += 1;
      ex.sets.forEach((set) => {
        totalSets += 1;
        if (set.completed) {
          totalVolume += set.weight * set.reps;
          if (set.rpe) {
            rpeValues.push(set.rpe);
          }
        }
      });
    });
  });

  const averageRPE = rpeValues.length > 0 ? Math.round(rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) : undefined;

  // Muscle Balance
  const muscleGroups = new Map<string, number>();
  recentLogs.forEach((log) => {
    log.exercises.forEach((ex) => {
      const exercise = exercises.find((e) => e.id === ex.exerciseId);
      if (exercise) {
        const current = muscleGroups.get(exercise.muscleGroup) || 0;
        let volume = 0;
        ex.sets.forEach((set) => {
          if (set.completed) {
            volume += set.weight * set.reps;
          }
        });
        muscleGroups.set(exercise.muscleGroup, current + volume);
      }
    });
  });

  const sortedMuscles = Array.from(muscleGroups.entries()).sort((a, b) => b[1] - a[1]);
  const weakPoints = sortedMuscles.slice(-3).map((m) => m[0]).filter((m) => m);
  const strongPoints = sortedMuscles.slice(0, 3).map((m) => m[0]).filter((m) => m);

  // Progression Trend
  const lastWeekDate = new Date();
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeekLogs = recentLogs.filter((log) => new Date(log.date) >= lastWeekDate);

  let lastWeekVolume = 0;
  lastWeekLogs.forEach((log) => {
    log.exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        if (set.completed) {
          lastWeekVolume += set.weight * set.reps;
        }
      });
    });
  });

  const averageWeeklyVolume = recentLogs.length > 0 ? Math.round(totalVolume / (recentDays / 7)) : 0;

  let trend: 'improving' | 'stagnant' | 'declining' = 'stagnant';
  if (lastWeekVolume > averageWeeklyVolume * 1.1) {
    trend = 'improving';
  } else if (lastWeekVolume < averageWeeklyVolume * 0.9) {
    trend = 'declining';
  }

  // Recovery
  let lastRestDays = 0;
  if (recentLogs.length > 0) {
    const lastWorkout = recentLogs[0];
    const today = new Date();
    lastRestDays = Math.floor((today.getTime() - new Date(lastWorkout.date).getTime()) / (1000 * 60 * 60 * 24));
  }

  const recommendedRest = averageRPE && averageRPE >= 8 ? 2 : 1;

  return {
    workoutSummary: {
      totalVolume,
      totalSets,
      averageRPE,
      exerciseCount,
      duration: totalDuration,
    },
    muscleBalance: {
      balanced: weakPoints.length <= 2,
      weakPoints,
      strongPoints,
    },
    progression: {
      trend,
      lastWeekVolume,
      averageWeeklyVolume,
    },
    recovery: {
      lastRestDays,
      recommendedRest,
    },
  };
}

/**
 * Generate coach prompt for AI
 */
export function generateCoachPrompt(analysis: CoachAnalysis): string {
  return `Eres un entrenador personal de fitness experto. Analiza el histórico de entrenamientos del usuario:

## Resumen de Entrenamiento
- Volumen total: ${(analysis.workoutSummary.totalVolume / 1000).toFixed(1)}k kg×reps
- Series completadas: ${analysis.workoutSummary.totalSets}
- RPE promedio: ${analysis.workoutSummary.averageRPE || 'N/A'}/10
- Horas entrenadas: ${(analysis.workoutSummary.duration / 3600).toFixed(1)}

## Balance Muscular
- Grupos fuertes: ${analysis.muscleBalance.strongPoints.join(', ')}
- Grupos débiles: ${analysis.muscleBalance.weakPoints.join(', ')}
- Estado: ${analysis.muscleBalance.balanced ? 'Equilibrado' : 'Desbalanceado'}

## Progresión
- Tendencia: ${analysis.progression.trend}
- Volumen últimas 7 días: ${(analysis.progression.lastWeekVolume / 1000).toFixed(1)}k
- Promedio semanal: ${(analysis.progression.averageWeeklyVolume / 1000).toFixed(1)}k

## Recuperación
- Días desde último entrenamiento: ${analysis.recovery.lastRestDays}
- Descanso recomendado: ${analysis.recovery.recommendedRest} día(s)

Por favor proporciona:
1. Un análisis de su progreso actual
2. 2-3 sugerencias específicas para mejorar
3. Cambios recomendados en la rutina (si aplica)

Sé conciso, práctico y motivador.`;
}

/**
 * Parse coach response into structured suggestion
 */
export function parseCoachResponse(response: string, type: CoachSuggestion['type']): CoachSuggestion {
  // Extract title (first line or sentence)
  const lines = response.split('\n').filter((l) => l.trim());
  const title = lines[0]?.substring(0, 100) || 'Sugerencia del Coach';

  return {
    id: `coach-${Date.now()}`,
    date: new Date().toISOString(),
    type,
    title,
    suggestion: response,
    reasoning: 'Basado en análisis de datos de entrenamiento',
    priority: type === 'recovery' ? 'high' : type === 'balance' ? 'medium' : 'low',
  };
}

/**
 * Format configuration for display
 */
export function formatCoachConfig(config: AICoachConfig): string {
  const providers: Record<AIProvider, string> = {
    anthropic: 'Claude (Anthropic)',
    openai: 'ChatGPT (OpenAI)',
    gemini: 'Gemini (Google)',
  };

  return `${providers[config.provider]} ${config.enabled ? '✓ Activo' : '✗ Inactivo'}`;
}

/**
 * Validate API key format
 */
export function validateAPIKey(key: string, provider: AIProvider): boolean {
  if (!key) return false;

  switch (provider) {
    case 'anthropic':
      return key.startsWith('sk-ant-');
    case 'openai':
      return key.startsWith('sk-');
    case 'gemini':
      return key.length > 20;
    default:
      return false;
  }
}

/**
 * Encrypt API key locally (simple XOR for demo, use proper crypto in production)
 */
export function encryptAPIKey(key: string): string {
  // In production, use proper encryption like TweetNaCl.js or libsodium
  return btoa(key); // Base64 encoding as placeholder
}

/**
 * Decrypt API key locally
 */
export function decryptAPIKey(encrypted: string): string {
  // In production, use proper decryption
  return atob(encrypted); // Base64 decoding as placeholder
}
