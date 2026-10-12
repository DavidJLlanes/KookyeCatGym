import { Exercise, WorkoutLog } from '../types';
import { ProgressionRule, PROGRESSION_TYPE_LABEL } from './progressionRules';

// Resumen compacto del historial que se envía al Coach IA: solo cifras
// agregadas de las últimas 8 semanas (sin datos personales ni el historial entero).

const WEEKS = 8;
const DAY = 86400000;

const epley = (weight: number, reps: number) => (reps > 0 && weight > 0 ? weight * (1 + reps / 30) : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildCoachSummary(logs: WorkoutLog[], exercises: Exercise[], rules: ProgressionRule[]) {
  const now = Date.now();
  const start = now - WEEKS * 7 * DAY;
  const midpoint = now - (WEEKS / 2) * 7 * DAY;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const recent = logs
    .filter((l) => new Date(l.date).getTime() >= start)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const sessionsPerWeek = Array.from({ length: WEEKS }, () => 0);
  const setsByGroupRecent: Record<string, number> = {};
  const setsByGroupPrevious: Record<string, number> = {};
  const perExercise = new Map<
    string,
    { sessions: number; sets: number; rpe: number[]; e1rmFirst: number; e1rmSecond: number; best: { w: number; r: number } | null }
  >();

  for (const log of recent) {
    const t = new Date(log.date).getTime();
    const week = Math.min(WEEKS - 1, Math.floor((t - start) / (7 * DAY)));
    sessionsPerWeek[week]++;
    const isRecentHalf = t >= midpoint;

    for (const we of log.exercises) {
      const ex = byId.get(we.exerciseId);
      if (!ex) continue;
      const working = we.sets.filter((s) => s.completed && !s.isWarmup);
      if (working.length === 0) continue;

      const groupTarget = isRecentHalf ? setsByGroupRecent : setsByGroupPrevious;
      groupTarget[ex.muscleGroup] = (groupTarget[ex.muscleGroup] || 0) + working.length;

      const stat = perExercise.get(ex.id) ?? { sessions: 0, sets: 0, rpe: [], e1rmFirst: 0, e1rmSecond: 0, best: null };
      stat.sessions++;
      stat.sets += working.length;
      for (const s of working) {
        if (s.rpe) stat.rpe.push(s.rpe);
        const e1rm = epley(s.weight, s.reps);
        if (isRecentHalf) stat.e1rmSecond = Math.max(stat.e1rmSecond, e1rm);
        else stat.e1rmFirst = Math.max(stat.e1rmFirst, e1rm);
        if (isRecentHalf && (!stat.best || e1rm > epley(stat.best.w, stat.best.r))) stat.best = { w: s.weight, r: s.reps };
      }
      perExercise.set(ex.id, stat);
    }
  }

  const topExercises = [...perExercise.entries()]
    .sort((a, b) => b[1].sets - a[1].sets)
    .slice(0, 15)
    .map(([id, s]) => {
      const ex = byId.get(id)!;
      return {
        ejercicio: ex.name,
        grupo: ex.muscleGroup,
        equipamiento: ex.equipment,
        sesiones: s.sessions,
        seriesDeTrabajo: s.sets,
        mejorSerieUltimas4Semanas: s.best ? (s.best.w > 0 ? `${s.best.w} kg × ${s.best.r}` : `${s.best.r} reps`) : null,
        '1RMEstimado4SemanasAnteriores': s.e1rmFirst ? round1(s.e1rmFirst) : null,
        '1RMEstimadoUltimas4Semanas': s.e1rmSecond ? round1(s.e1rmSecond) : null,
        rpeMedio: s.rpe.length ? round1(s.rpe.reduce((a, b) => a + b, 0) / s.rpe.length) : null,
      };
    });

  const durations = recent.map((l) => l.duration).filter((d) => d > 0);
  const lastLog = logs.reduce<string | null>((latest, l) => (!latest || l.date > latest ? l.date : latest), null);

  return {
    periodo: `últimas ${WEEKS} semanas (hasta ${new Date(now).toISOString().slice(0, 10)})`,
    ultimoEntrenamiento: lastLog ? lastLog.slice(0, 10) : null,
    totalEntrenamientosHistorico: logs.length,
    sesiones: {
      total: recent.length,
      porSemanaDeMasAntiguaAMasReciente: sessionsPerWeek,
      duracionMediaMinutos: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60) : null,
    },
    seriesDeTrabajoPorGrupo: {
      ultimas4Semanas: setsByGroupRecent,
      cuatroSemanasAnteriores: setsByGroupPrevious,
    },
    ejerciciosPrincipales: topExercises,
    reglasDeProgresion: rules
      .filter((r) => r.enabled)
      .map((r) => ({ ejercicio: byId.get(r.exerciseId)?.name ?? r.exerciseId, tipo: PROGRESSION_TYPE_LABEL[r.type] })),
  };
}
