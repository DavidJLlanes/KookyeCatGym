import { useMemo } from 'react';
import { WorkoutLog, Exercise } from '../types';
import { MUSCLE_GROUPS, getMuscleColor } from '../data/exerciseMeta';
import { computeAllTimeRecords, computeSessionRecords } from '../utils/records';

/**
 * Estadísticas globales de la pestaña Progreso: totales, rachas, tiempo
 * entrenado, comparativa interanual, ranking de ejercicios, últimos récords y
 * última vez que se entrenó cada grupo muscular.
 */
export function useProgressStats(logs: WorkoutLog[], exercises: Exercise[]) {
  // Muscle focus: calculates completed sets per muscle group
  const muscleFocusData = useMemo(() => {
    const focus: Record<string, number> = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0]));

    logs.forEach((log) => {
      log.exercises.forEach((we) => {
        const ex = exercises.find((e) => e.id === we.exerciseId);
        if (ex) {
          const completedSetsCount = we.sets.filter((s) => s.completed).length;
          focus[ex.muscleGroup] = (focus[ex.muscleGroup] ?? 0) + completedSetsCount;
        }
      });
    });

    return Object.entries(focus).map(([name, value]) => ({
      name,
      value,
      color: getMuscleColor(name),
    }));
  }, [logs, exercises]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalWorkouts = logs.length;
    let totalSetsLogged = 0;
    let totalKgLifted = 0;

    logs.forEach((log) => {
      log.exercises.forEach((we) => {
        we.sets.forEach((set) => {
          if (set.completed) {
            totalSetsLogged++;
            totalKgLifted += set.weight * set.reps;
          }
        });
      });
    });

    // Racha real: días consecutivos entrenados contando hacia atrás desde hoy
    // (o desde ayer, si aún no has entrenado hoy).
    let currentStreak = 0;
    let longestStreak = 0;
    if (logs.length > 0) {
      const daySet = new Set(logs.map((log) => new Date(log.date).toDateString()));
      const cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      // Si no has entrenado hoy, la racha puede seguir viva desde ayer
      if (!daySet.has(cursor.toDateString())) {
        cursor.setDate(cursor.getDate() - 1);
      }
      while (daySet.has(cursor.toDateString())) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      }

      // Récord histórico: se recorren todos los días únicos entrenados (ordenados)
      // y se mide la racha más larga de días consecutivos en cualquier punto.
      // Importante: se compara avanzando la fecha de calendario (setDate+1),
      // no restando milisegundos exactos — en los dos días de cambio de
      // hora, dos medianoches locales consecutivas están a 23h o 25h de
      // distancia, nunca a 24h exactas, así que una comparación por ms
      // rompería la racha justo ahí aunque sí se entrenara todos los días.
      const uniqueDays = Array.from(daySet)
        .map((d) => new Date(d))
        .sort((a, b) => a.getTime() - b.getTime());
      let running = 0;
      let prevDate: Date | null = null;
      for (const current of uniqueDays) {
        if (prevDate !== null) {
          const nextExpected = new Date(prevDate);
          nextExpected.setDate(nextExpected.getDate() + 1);
          running = nextExpected.toDateString() === current.toDateString() ? running + 1 : 1;
        } else {
          running = 1;
        }
        if (running > longestStreak) longestStreak = running;
        prevDate = current;
      }
    }

    return {
      totalWorkouts,
      totalSetsLogged,
      totalKgLifted: Math.round(totalKgLifted),
      streak: currentStreak,
      longestStreak,
    };
  }, [logs]);

  // Tiempo entrenado: total histórico, parcial de hoy y parcial de esta semana (Lunes-Domingo)
  const timeStats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(todayStart);
    const dayOfWeek = weekStart.getDay(); // 0=Domingo, 1=Lunes, ... 6=Sábado
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - daysSinceMonday);

    let totalSeconds = 0;
    let todaySeconds = 0;
    let weekSeconds = 0;

    logs.forEach((log) => {
      const logDate = new Date(log.date);
      totalSeconds += log.duration;
      if (logDate >= weekStart) weekSeconds += log.duration;
      if (logDate >= todayStart) todaySeconds += log.duration;
    });

    return { totalSeconds, todaySeconds, weekSeconds };
  }, [logs]);

  // Comparativa interanual: mes en curso vs el mismo mes del año pasado
  // (solo tiene sentido enseñarla si hay datos de hace un año o más).
  const yearOverYear = useMemo(() => {
    const now = new Date();
    const sumFor = (year: number, month: number) => {
      let volume = 0;
      let workouts = 0;
      let sets = 0;
      logs.forEach((log) => {
        const d = new Date(log.date);
        if (d.getFullYear() === year && d.getMonth() === month) {
          workouts++;
          log.exercises.forEach((we) => {
            we.sets.forEach((s) => {
              if (s.completed) {
                volume += s.weight * s.reps;
                sets++;
              }
            });
          });
        }
      });
      return { volume: Math.round(volume), workouts, sets };
    };

    const current = sumFor(now.getFullYear(), now.getMonth());
    const previous = sumFor(now.getFullYear() - 1, now.getMonth());
    const monthName = now.toLocaleDateString('es-ES', { month: 'long' });

    return { current, previous, monthName, hasPreviousData: previous.workouts > 0 };
  }, [logs]);

  const pctChange = (curr: number, prev: number): number | null => {
    if (prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // Ranking de ejercicios más entrenados (por volumen total levantado)
  const exerciseRanking = useMemo(() => {
    const byExercise: Record<string, { volume: number; sets: number }> = {};
    logs.forEach((log) => {
      log.exercises.forEach((we) => {
        const completed = we.sets.filter((s) => s.completed);
        if (completed.length === 0) return;
        if (!byExercise[we.exerciseId]) byExercise[we.exerciseId] = { volume: 0, sets: 0 };
        completed.forEach((s) => {
          byExercise[we.exerciseId].volume += s.weight * s.reps;
          byExercise[we.exerciseId].sets += 1;
        });
      });
    });

    return Object.entries(byExercise)
      .map(([exerciseId, data]) => {
        const ex = exercises.find((e) => e.id === exerciseId);
        return { exerciseId, name: ex?.name || 'Ejercicio', muscleGroup: ex?.muscleGroup || '', ...data };
      })
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);
  }, [logs, exercises]);

  // Días desde la última vez que se entrenó cada grupo muscular.
  // Se comparan medianoches locales (no instantes exactos): dos "días" con
  // <24h reales entre ellos (ej. entrenar a las 23:50 y luego a las 00:10)
  // deben contar como "ayer", no como "hace 0 días" por redondeo hacia
  // abajo del tiempo transcurrido. Además, restar medianoches en vez de
  // timestamps crudos evita el mismo problema de cambio de hora (DST) que
  // afecta a longestStreak.
  const daysSinceByMuscle = useMemo(() => {
    const toMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const lastDateByGroup: Record<string, number> = {};
    logs.forEach((log) => {
      const midnight = toMidnight(new Date(log.date));
      log.exercises.forEach((we) => {
        const hasCompleted = we.sets.some((s) => s.completed);
        if (!hasCompleted) return;
        const ex = exercises.find((e) => e.id === we.exerciseId);
        if (!ex) return;
        if (!lastDateByGroup[ex.muscleGroup] || midnight > lastDateByGroup[ex.muscleGroup]) {
          lastDateByGroup[ex.muscleGroup] = midnight;
        }
      });
    });

    const todayMidnight = toMidnight(new Date());
    return MUSCLE_GROUPS.map((group) => {
      const lastTime = lastDateByGroup[group];
      const days = lastTime ? Math.round((todayMidnight - lastTime) / (24 * 60 * 60 * 1000)) : null;
      return { group, days };
    });
  }, [logs, exercises]);

  // Feed cronológico de récords históricos (peso y repeticiones)
  const prEvents = useMemo(() => computeAllTimeRecords(logs, exercises), [logs, exercises]);
  // Último entrenamiento finalizado + si batió algún récord (para poder
  // compartir también su resumen desde el modal de "Compartir").
  const lastWorkoutShare = useMemo(() => {
    if (logs.length === 0) return null;
    const sorted = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const last = sorted[0];
    const previous = sorted.slice(1);
    const summary = computeSessionRecords(last.exercises, previous, exercises);
    const hasRecord =
      Object.keys(summary.weightRecords).length > 0 || Object.keys(summary.repRecords).length > 0;
    return { last, hasRecord };
  }, [logs, exercises]);

  const formatDuration = (totalSeconds: number) => {
    const totalMinutes = Math.round(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} min`;
  };


  return {
    muscleFocusData, stats, timeStats, yearOverYear, pctChange, exerciseRanking,
    daysSinceByMuscle, prEvents, lastWorkoutShare, formatDuration,
  };
}
