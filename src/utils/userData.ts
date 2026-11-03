// Datos propios del usuario que no caben en las tablas de rutinas/logs: se
// guardan en el servidor como documentos JSON por clave (endpoint "user-data")
// y se cachean en localStorage para que la app funcione sin conexión.

import type { ActiveProgram } from './programs';

/** Un peso corporal: un valor por día (si hay dos el mismo día, manda el último). */
export interface BodyWeightEntry {
  date: string; // YYYY-MM-DD, en hora local
  kg: number;
}

/** Objetivo de peso corporal. */
export interface BodyGoal {
  mode: 'lose' | 'gain' | 'hold';
  targetKg: number;
  // Solo en 'hold': margen aceptable a cada lado del objetivo (kg).
  toleranceKg?: number;
  // Ritmo semanal que quieres llevar (kg/semana, positivo). Opcional: sirve
  // para avisar si vas más rápido o más lento de lo previsto.
  plannedRateKg?: number;
}

/** Rutinas que forman la rotación (A, B, C, A, ...), en su orden. */
export interface RotationConfig {
  enabled: boolean;
  routineIds: string[];
}

/** Pila de pesas real de una máquina: los pesos que ofrece, de menor a mayor. */
export type WeightStacks = Record<string, number[]>;

/** Equipamiento que tienes: si está activo, el catálogo y los filtros solo muestran lo que puedes hacer. */
export interface MyEquipment {
  enabled: boolean;
  owned: string[]; // valores de EQUIPMENT_TYPES; "Peso Corporal" siempre cuenta
}

/** Primer día de la semana. */
export type WeekStart = 'mon' | 'sun';

/** Una sesión movida de día solo para una semana (week = primer día de esa semana). */
export interface PlanMove {
  week: string; // YYYY-MM-DD
  routineId: string;
  from: number; // día original, 0 = lunes
  to: number;
}

/** Semanas de descarga: cada cierto número de semanas se baja el volumen y la carga. */
export interface DeloadConfig {
  enabled: boolean;
  everyWeeks: number; // 4 = tres semanas de carga y una de descarga
  startWeek: string | null; // primer día de la semana en que empieza el ciclo
  loadPercent: number; // % del peso habitual (90 = un 10 % menos)
  setsPercent: number; // % de las series habituales
  manualWeeks: string[]; // semanas marcadas a mano (primer día de la semana)
}

export interface UserDataShape {
  /** Programa de varias semanas en marcha, o null. */
  program: ActiveProgram | null;
  'body-weights': BodyWeightEntry[];
  'body-goal': BodyGoal | null;
  rotation: RotationConfig;
  'weight-stacks': WeightStacks;
  favorites: string[];
  'my-equipment': MyEquipment;
  'week-start': WeekStart;
  'plan-moves': PlanMove[];
  deload: DeloadConfig;
}

export type UserDataKey = keyof UserDataShape;

export const USER_DATA_DEFAULTS: UserDataShape = {
  program: null,
  'body-weights': [],
  'body-goal': null,
  rotation: { enabled: false, routineIds: [] },
  'weight-stacks': {},
  favorites: [],
  'my-equipment': { enabled: false, owned: [] },
  'week-start': 'mon',
  'plan-moves': [],
  deload: { enabled: false, everyWeeks: 4, startWeek: null, loadPercent: 90, setsPercent: 60, manualWeeks: [] },
};

/** Fecha local YYYY-MM-DD (no UTC: así un pesaje de madrugada cae en su día). */
export function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Lo que llega del servidor/caché se valida: un documento corrupto no debe romper la app. */
export function sanitizeUserData(raw: unknown): UserDataShape {
  const out: UserDataShape = {
    program: null,
    'body-weights': [],
    'body-goal': null,
    rotation: { enabled: false, routineIds: [] },
    'weight-stacks': {},
    favorites: [],
    'my-equipment': { enabled: false, owned: [] },
    'week-start': 'mon',
    'plan-moves': [],
    deload: { enabled: false, everyWeeks: 4, startWeek: null, loadPercent: 90, setsPercent: 60, manualWeeks: [] },
  };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;

  if (Array.isArray(r['body-weights'])) {
    const byDay = new Map<string, number>();
    for (const e of r['body-weights'] as any[]) {
      if (e && typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && typeof e.kg === 'number' && e.kg > 0 && e.kg < 700) {
        byDay.set(e.date, e.kg);
      }
    }
    out['body-weights'] = [...byDay.entries()].map(([date, kg]) => ({ date, kg })).sort((a, b) => a.date.localeCompare(b.date));
  }

  const g = r['body-goal'] as any;
  if (g && ['lose', 'gain', 'hold'].includes(g.mode) && typeof g.targetKg === 'number' && g.targetKg > 0) {
    out['body-goal'] = {
      mode: g.mode,
      targetKg: g.targetKg,
      ...(typeof g.toleranceKg === 'number' && g.toleranceKg >= 0 ? { toleranceKg: g.toleranceKg } : {}),
      ...(typeof g.plannedRateKg === 'number' && g.plannedRateKg > 0 ? { plannedRateKg: g.plannedRateKg } : {}),
    };
  }

  const rot = r.rotation as any;
  if (rot && Array.isArray(rot.routineIds)) {
    out.rotation = { enabled: !!rot.enabled, routineIds: rot.routineIds.filter((x: unknown) => typeof x === 'string') };
  }

  if (Array.isArray(r.favorites)) {
    out.favorites = [...new Set((r.favorites as unknown[]).filter((x): x is string => typeof x === 'string'))];
  }
  const eq = r['my-equipment'] as any;
  if (eq && typeof eq === 'object') {
    out['my-equipment'] = {
      enabled: !!eq.enabled,
      owned: Array.isArray(eq.owned) ? [...new Set((eq.owned as unknown[]).filter((x): x is string => typeof x === 'string'))] : [],
    };
  }

  if (r['week-start'] === 'sun') out['week-start'] = 'sun';
  if (Array.isArray(r['plan-moves'])) {
    out['plan-moves'] = (r['plan-moves'] as any[])
      .filter(
        (m) =>
          m &&
          typeof m.week === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(m.week) &&
          typeof m.routineId === 'string' &&
          Number.isInteger(m.from) &&
          Number.isInteger(m.to) &&
          m.from >= 0 &&
          m.from <= 6 &&
          m.to >= 0 &&
          m.to <= 6
      )
      .map((m) => ({ week: m.week, routineId: m.routineId, from: m.from, to: m.to }));
  }
  const dl = r.deload as any;
  if (dl && typeof dl === 'object') {
    const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : d);
    const isDay = (w: unknown): w is string => typeof w === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w);
    out.deload = {
      enabled: !!dl.enabled,
      everyWeeks: Math.round(num(dl.everyWeeks, 2, 12, 4)),
      startWeek: isDay(dl.startWeek) ? dl.startWeek : null,
      loadPercent: num(dl.loadPercent, 30, 100, 90),
      setsPercent: num(dl.setsPercent, 30, 100, 60),
      manualWeeks: Array.isArray(dl.manualWeeks) ? (dl.manualWeeks as unknown[]).filter(isDay) : [],
    };
  }

  const pr = r.program as any;
  if (pr && typeof pr.programId === 'string' && typeof pr.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(pr.startDate) && pr.trainingMaxes && typeof pr.trainingMaxes === 'object') {
    const maxes: Record<string, number> = {};
    for (const [id, kg] of Object.entries(pr.trainingMaxes)) if (typeof kg === 'number' && kg > 0 && kg < 1000) maxes[id] = kg;
    out.program = { programId: pr.programId, startDate: pr.startDate, trainingMaxes: maxes };
  }

  const st = r['weight-stacks'] as any;
  if (st && typeof st === 'object' && !Array.isArray(st)) {
    for (const [id, list] of Object.entries(st)) {
      if (Array.isArray(list)) {
        const nums = (list as unknown[]).filter((n): n is number => typeof n === 'number' && n >= 0 && Number.isFinite(n));
        if (nums.length > 0) out['weight-stacks'][id] = [...new Set(nums)].sort((a, b) => a - b);
      }
    }
  }
  return out;
}
