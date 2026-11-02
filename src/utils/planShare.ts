import type { Exercise, Routine, WorkoutExercise, WorkoutSet } from '../types';
import { formatDuration, isCardio, isHold } from './holdSets';

// Compartir rutinas: un archivo (.zgym-plan.json) que otra persona puede importar,
// y una hoja para imprimir o guardar como PDF. El archivo guarda el id y el
// nombre de cada ejercicio: al importar se busca por id y, si no está, por nombre.

export const PLAN_FILE_APP = 'zgym-plan';
export const PLAN_FILE_VERSION = 1;

interface PlanFileSet {
  weight: number;
  reps: number;
  restTime?: number;
  isWarmup?: boolean;
  setType?: WorkoutSet['setType'];
  distance?: number;
}

interface PlanFileExercise {
  exerciseId: string;
  name: string;
  restTime?: number;
  perSide?: boolean;
  supersetId?: string;
  alternativeIds?: string[];
  sets: PlanFileSet[];
}

export interface PlanFile {
  app: typeof PLAN_FILE_APP;
  version: number;
  exportedAt: string;
  routines: Array<{ name: string; description: string; dayOfWeek?: string; folder?: string; exercises: PlanFileExercise[] }>;
}

export function buildPlanFile(routines: Routine[], exercises: Exercise[], now: Date = new Date()): PlanFile {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  return {
    app: PLAN_FILE_APP,
    version: PLAN_FILE_VERSION,
    exportedAt: now.toISOString(),
    routines: routines.map((r) => ({
      name: r.name,
      description: r.description,
      ...(r.dayOfWeek ? { dayOfWeek: r.dayOfWeek } : {}),
      ...(r.folder ? { folder: r.folder } : {}),
      exercises: r.exercises.map((we) => ({
        exerciseId: we.exerciseId,
        name: byId.get(we.exerciseId)?.name ?? we.exerciseId,
        ...(we.restTime !== undefined ? { restTime: we.restTime } : {}),
        ...(we.perSide ? { perSide: true } : {}),
        ...(we.supersetId ? { supersetId: we.supersetId } : {}),
        ...(we.alternativeIds && we.alternativeIds.length > 0 ? { alternativeIds: we.alternativeIds } : {}),
        sets: we.sets.map((s) => ({
          weight: s.weight,
          reps: s.reps,
          ...(s.restTime !== undefined ? { restTime: s.restTime } : {}),
          ...(s.isWarmup ? { isWarmup: true } : {}),
          ...(s.setType ? { setType: s.setType } : {}),
          ...(s.distance !== undefined ? { distance: s.distance } : {}),
        })),
      })),
    })),
  };
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

let counter = 0;
const uid = (p: string) => `${p}-${Date.now()}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export interface PlanImportResult {
  routines: Routine[];
  /** Ejercicios del archivo que no se encontraron aquí (se omiten). */
  missing: string[];
  error: string | null;
}

const isNum = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');

/** Lee un archivo de plan: valida todo (viene de fuera) y lo convierte en rutinas nuevas. */
export function parsePlanFile(text: string, exercises: Exercise[]): PlanImportResult {
  const fail = (error: string): PlanImportResult => ({ routines: [], missing: [], error });
  if (text.length > 2_000_000) return fail('El archivo es demasiado grande.');
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail('El archivo no es un plan válido (no se puede leer).');
  }
  if (!raw || raw.app !== PLAN_FILE_APP || !Array.isArray(raw.routines)) return fail('Este archivo no es un plan de ZGym.');
  if (typeof raw.version === 'number' && raw.version > PLAN_FILE_VERSION) return fail('El archivo es de una versión más nueva de la app.');
  if (raw.routines.length === 0 || raw.routines.length > 50) return fail('El plan está vacío o tiene demasiadas rutinas.');

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const byName = new Map(exercises.map((e) => [norm(e.name), e]));
  const missing = new Set<string>();
  const resolve = (id: unknown, name: unknown): Exercise | undefined => byId.get(str(id, 40)) ?? byName.get(norm(str(name, 200)));

  const routines: Routine[] = [];
  for (const r of raw.routines) {
    if (!r || typeof r !== 'object' || !Array.isArray(r.exercises) || r.exercises.length > 60) continue;
    const list: WorkoutExercise[] = [];
    const idMap = new Map<string, string>(); // supersetId del archivo -> nuevo
    for (const e of r.exercises) {
      if (!e || !Array.isArray(e.sets) || e.sets.length === 0 || e.sets.length > 40) continue;
      const ex = resolve(e.exerciseId, e.name);
      if (!ex) {
        missing.add(str(e.name, 200) || str(e.exerciseId, 40));
        continue;
      }
      const sets: WorkoutSet[] = e.sets
        .filter((s: any) => s && isNum(s.weight, 0, 2000) && isNum(s.reps, 0, 100000))
        .map((s: any) => ({
          id: uid('set-imp'),
          weight: s.weight,
          reps: Math.round(s.reps),
          completed: false,
          ...(isNum(s.restTime, 0, 3600) ? { restTime: Math.round(s.restTime) } : {}),
          ...(s.isWarmup === true ? { isWarmup: true } : {}),
          ...(s.setType === 'drop' || s.setType === 'failure' || s.setType === 'restpause' ? { setType: s.setType } : {}),
          ...(isNum(s.distance, 0, 1000) ? { distance: s.distance } : {}),
        }));
      if (sets.length === 0) continue;
      let supersetId: string | undefined;
      if (typeof e.supersetId === 'string' && e.supersetId) {
        supersetId = idMap.get(e.supersetId) ?? uid('ss-imp');
        idMap.set(e.supersetId, supersetId);
      }
      const alternatives = Array.isArray(e.alternativeIds) ? (e.alternativeIds as unknown[]).filter((a): a is string => typeof a === 'string' && byId.has(a) && a !== ex.id).slice(0, 4) : [];
      list.push({
        id: uid('we-imp'),
        exerciseId: ex.id,
        ...(isNum(e.restTime, 0, 3600) ? { restTime: Math.round(e.restTime) } : { restTime: ex.defaultRestTime }),
        ...(e.perSide === true ? { perSide: true } : {}),
        ...(supersetId ? { supersetId } : {}),
        ...(alternatives.length > 0 ? { alternativeIds: alternatives } : {}),
        sets,
      });
    }
    if (list.length === 0) continue;
    routines.push({
      id: uid('routine-imp'),
      name: str(r.name, 80) || 'Rutina importada',
      description: str(r.description, 300),
      ...(str(r.dayOfWeek, 60) ? { dayOfWeek: str(r.dayOfWeek, 60) } : {}),
      ...(str(r.folder, 60) ? { folder: str(r.folder, 60) } : {}),
      exercises: list,
    });
  }
  if (routines.length === 0) return { routines: [], missing: [...missing], error: 'No se ha podido importar ningún ejercicio de este plan.' };
  return { routines, missing: [...missing], error: null };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function setText(s: WorkoutSet, ex: Exercise | undefined, perSide: boolean): string {
  const kind = s.isWarmup ? 'C' : s.setType === 'drop' ? 'D' : s.setType === 'failure' ? 'F' : s.setType === 'restpause' ? 'RP' : '';
  let body: string;
  if (isCardio(ex)) body = `${formatDuration(s.reps)}${s.distance ? ` · ${String(s.distance).replace('.', ',')} km` : ''}`;
  else if (isHold(ex)) body = formatDuration(s.reps);
  else body = `${s.weight > 0 ? `${String(s.weight).replace('.', ',')} kg × ` : ''}${s.reps}${perSide ? '/lado' : ''}`;
  return `${kind ? `<b>${kind}</b> ` : ''}${esc(body)}`;
}

/** Documento HTML para imprimir o guardar como PDF (lo abre el navegador con «Imprimir»). */
export function buildPrintableHtml(routines: Routine[], exercises: Exercise[], title = 'Mi plan de entrenamiento'): string {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const blocks = routines
    .map((r) => {
      const rows = r.exercises
        .map((we, i) => {
          const ex = byId.get(we.exerciseId);
          const sets = we.sets.map((s) => setText(s, ex, !!we.perSide)).join(' &nbsp;·&nbsp; ');
          const rest = we.restTime !== undefined ? (we.restTime > 0 ? `${we.restTime} s` : 'sin descanso') : '';
          return `<tr><td class="n">${i + 1}</td><td><b>${esc(ex?.name ?? we.exerciseId)}</b>${we.supersetId ? ' <span class="tag">superserie</span>' : ''}</td><td>${sets}</td><td class="r">${esc(rest)}</td></tr>`;
        })
        .join('');
      return `<section><h2>${esc(r.name)}</h2><p class="meta">${esc([r.folder, r.dayOfWeek].filter(Boolean).join(' · '))}${r.description ? ` — ${esc(r.description)}` : ''}</p><table><thead><tr><th>#</th><th>Ejercicio</th><th>Series</th><th>Descanso</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    })
    .join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#0f172a;margin:24px;font-size:13px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:22px 0 2px;border-bottom:2px solid #1d4ed8;padding-bottom:3px}
.meta{margin:2px 0 8px;color:#475569}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #e2e8f0;vertical-align:top}
th{font-size:11px;text-transform:uppercase;color:#64748b}.n,.r{white-space:nowrap}.tag{font-size:10px;background:#ede9fe;color:#5b21b6;padding:1px 5px;border-radius:6px}
section{page-break-inside:avoid}footer{margin-top:24px;color:#94a3b8;font-size:11px}
@media print{body{margin:12mm}}
</style></head><body><h1>${esc(title)}</h1><p class="meta">C = calentamiento · D = drop set · F = al fallo · RP = rest-pause</p>${blocks}<footer>Generado con ZGym</footer></body></html>`;
}
