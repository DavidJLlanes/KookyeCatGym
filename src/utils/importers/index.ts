import { WorkoutLog, WorkoutExercise } from '../../types';

export type ImportSource = 'hevy' | 'strong' | 'fitnotes';

export const IMPORT_SOURCE_LABEL: Record<ImportSource, string> = {
  hevy: 'Hevy',
  strong: 'Strong',
  fitnotes: 'FitNotes',
};

export interface ImportedSet {
  weight: number; // kg
  reps: number;
  isWarmup: boolean;
  rpe?: number;
}

export interface ImportedExercise {
  name: string;
  category?: string; // FitNotes trae categoría (Chest, Back…)
  sets: ImportedSet[];
}

export interface ImportedSession {
  key: string;
  title: string;
  date: Date;
  durationSec: number;
  exercises: ImportedExercise[];
}

export interface ImportParseResult {
  source: ImportSource;
  sessions: ImportedSession[];
  skippedRows: number;
  // Strong no indica la unidad del peso en el CSV
  unitUnknown: boolean;
}

const LB_TO_KG = 0.45359237;

// CSV con comillas, comillas dobles escapadas y saltos de línea dentro de
// campos (las notas pueden tenerlos). Detecta "," o ";" por la cabecera.
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0];
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

const num = (v: string | undefined): number => {
  if (!v) return 0;
  const n = parseFloat(v.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  ene: 0, abr: 3, ago: 7, dic: 11, sept: 8,
};

// Hevy: "21 Sep 2024, 18:30" (o con el mes en español); Strong: "2024-09-21 18:30:00";
// FitNotes: "2024-09-21". Todo se interpreta en hora local.
export function parseImportDate(value: string): Date | null {
  const v = value.trim();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [, y, mo, d, h, mi, s] = m;
    return new Date(+y, +mo - 1, +d, h ? +h : 12, mi ? +mi : 0, s ? +s : 0);
  }
  m = v.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]{3,5})\.?\s+(\d{4}),?\s*(\d{1,2}):(\d{2})/);
  if (m) {
    const month = MONTHS[m[2].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')];
    if (month !== undefined) return new Date(+m[3], month, +m[1], +m[4], +m[5]);
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Strong: "1h 5m", "45m", "50s" o segundos a secas
function parseDuration(value: string | undefined): number {
  if (!value) return 0;
  const v = value.trim();
  if (/^\d+$/.test(v)) return +v;
  let total = 0;
  for (const [, n, unit] of v.matchAll(/(\d+)\s*([hms])/gi)) {
    total += +n * (unit.toLowerCase() === 'h' ? 3600 : unit.toLowerCase() === 'm' ? 60 : 1);
  }
  return total;
}

const normHeader = (h: string) => h.trim().toLowerCase();

export function detectSource(headers: string[]): ImportSource | null {
  const h = headers.map(normHeader);
  if (h.includes('exercise_title') && h.includes('start_time')) return 'hevy';
  if (h.includes('exercise name') && (h.includes('workout name') || h.includes('set order'))) return 'strong';
  if (h.includes('exercise') && h.includes('category') && h.some((x) => x.startsWith('weight'))) return 'fitnotes';
  return null;
}

interface RowAccess {
  get: (name: string) => string;
  find: (prefix: string) => string;
}

function accessor(headers: string[], row: string[]): RowAccess {
  const h = headers.map(normHeader);
  return {
    get: (name) => row[h.indexOf(name)] ?? '',
    find: (prefix) => {
      const i = h.findIndex((x) => x.startsWith(prefix));
      return i >= 0 ? row[i] ?? '' : '';
    },
  };
}

/**
 * Lee un CSV exportado de Hevy, Strong o FitNotes y lo agrupa en sesiones.
 * `strongUnit` solo se usa con Strong, cuyo CSV no indica si el peso va en kg o lb.
 */
export function parseWorkoutExport(text: string, strongUnit: 'kg' | 'lb' = 'kg'): ImportParseResult {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('El archivo está vacío o no es un CSV.');

  const headers = rows[0];
  const source = detectSource(headers);
  if (!source) {
    throw new Error('No reconozco el formato. Exporta el CSV desde Hevy, Strong o FitNotes.');
  }

  const h = headers.map(normHeader);
  const weightHeader = h.find((x) => x.startsWith('weight')) ?? '';
  const headerSaysLb = /lb/.test(weightHeader);
  const headerSaysKg = /kg/.test(weightHeader);
  const unitUnknown = source === 'strong' && !headerSaysLb && !headerSaysKg;
  const toKg = headerSaysLb || (unitUnknown && strongUnit === 'lb') ? LB_TO_KG : 1;

  const sessions = new Map<string, ImportedSession>();
  let skippedRows = 0;

  for (const row of rows.slice(1)) {
    const r = accessor(headers, row);
    let key: string;
    let title: string;
    let dateStr: string;
    let exerciseName: string;
    let category: string | undefined;
    let isWarmup = false;
    let durationSec = 0;
    let rpe = 0;

    if (source === 'hevy') {
      dateStr = r.get('start_time');
      title = r.get('title') || 'Entrenamiento';
      key = `${dateStr}|${title}`;
      exerciseName = r.get('exercise_title');
      isWarmup = r.get('set_type').trim().toLowerCase() === 'warmup';
      rpe = num(r.get('rpe'));
      const start = parseImportDate(dateStr);
      const end = parseImportDate(r.get('end_time'));
      if (start && end) durationSec = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
    } else if (source === 'strong') {
      dateStr = r.get('date');
      title = r.get('workout name') || 'Entrenamiento';
      key = `${dateStr}|${title}`;
      exerciseName = r.get('exercise name');
      isWarmup = r.get('set order').trim().toUpperCase() === 'W';
      rpe = num(r.get('rpe'));
      durationSec = parseDuration(r.get('duration'));
    } else {
      dateStr = r.get('date');
      title = 'Entrenamiento';
      key = dateStr;
      exerciseName = r.get('exercise');
      category = r.get('category').trim() || undefined;
    }

    const weight = Math.round(num(r.find('weight')) * toKg * 100) / 100;
    const reps = Math.round(num(r.get('reps')));
    const date = parseImportDate(dateStr);

    // Filas de cardio (distancia/tiempo sin repeticiones) o incompletas
    if (!date || !exerciseName.trim() || reps <= 0) {
      skippedRows++;
      continue;
    }

    let session = sessions.get(key);
    if (!session) {
      session = { key, title, date, durationSec, exercises: [] };
      sessions.set(key, session);
    }

    const name = exerciseName.trim();
    let exercise = session.exercises.find((e) => e.name === name);
    if (!exercise) {
      exercise = { name, category, sets: [] };
      session.exercises.push(exercise);
    }

    const set: ImportedSet = { weight, reps, isWarmup };
    if (rpe >= 1) set.rpe = Math.min(10, Math.round(rpe));
    exercise.sets.push(set);
  }

  return {
    source,
    sessions: [...sessions.values()].sort((a, b) => b.date.getTime() - a.date.getTime()),
    skippedRows,
    unitUnknown,
  };
}

// Id estable por sesión: al importar dos veces el mismo archivo, las sesiones
// ya importadas se reconocen y no se duplican.
export function importedLogId(source: ImportSource, sessionKey: string): string {
  let hash = 5381;
  for (let i = 0; i < sessionKey.length; i++) hash = ((hash * 33) ^ sessionKey.charCodeAt(i)) >>> 0;
  return `import-${source}-${hash.toString(36)}`;
}

/**
 * Convierte las sesiones importadas en registros de historial de KookyeCatGym.
 * `exerciseIdFor` devuelve el id del ejercicio de KookyeCatGym para cada nombre importado,
 * o null para omitirlo.
 */
export function sessionsToLogs(
  source: ImportSource,
  sessions: ImportedSession[],
  exerciseIdFor: (name: string) => string | null
): WorkoutLog[] {
  const logs: WorkoutLog[] = [];

  for (const session of sessions) {
    const logId = importedLogId(source, session.key);
    const exercises: WorkoutExercise[] = [];

    session.exercises.forEach((ex, exIdx) => {
      const exerciseId = exerciseIdFor(ex.name);
      if (!exerciseId) return;
      exercises.push({
        id: `${logId}-e${exIdx}`,
        exerciseId,
        sets: ex.sets.map((s, setIdx) => ({
          id: `${logId}-e${exIdx}-s${setIdx}`,
          weight: s.weight,
          reps: s.reps,
          completed: true,
          ...(s.isWarmup ? { isWarmup: true } : {}),
          ...(s.rpe ? { rpe: s.rpe } : {}),
        })),
      });
    });

    if (exercises.length === 0) continue;

    logs.push({
      id: logId,
      routineName: session.title,
      date: session.date.toISOString(),
      duration: session.durationSec,
      exercises,
    });
  }

  return logs;
}
