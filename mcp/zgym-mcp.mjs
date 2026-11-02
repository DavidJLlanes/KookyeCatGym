#!/usr/bin/env node
// Servidor MCP de ZGym / KookyeCatGym (solo lectura).
//
// Deja que un asistente (Claude Desktop, Claude Code...) consulte tu historial de
// entrenamiento para responder preguntas y darte consejos con datos reales:
// «¿cómo voy?», «¿qué músculo descuido?», «¿cómo ha evolucionado mi press de banca?».
//
// Se ejecuta EN TU ORDENADOR y lee una copia de la base de datos (gym.db). No abre
// ningún puerto, no usa internet y no puede modificar nada: la base se abre en
// modo solo lectura. Requiere Node 22.5 o superior (usa node:sqlite).
//
// Uso:  node mcp/zgym-mcp.mjs --db F:/zgym_data/gym.db [--user nombre]

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_INFO = { name: 'zgym', version: '1.0.0' };

// ---------------------------------------------------------------- argumentos
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const DB_PATH = arg('db') || process.env.ZGYM_DB;
const USER_ARG = arg('user') || process.env.ZGYM_USER;

function fatal(message) {
  process.stderr.write(`zgym-mcp: ${message}\n`);
  process.exit(1);
}
if (!DB_PATH) fatal('falta la ruta de la base de datos: --db <ruta a gym.db> (o la variable ZGYM_DB)');
if (!fs.existsSync(DB_PATH)) fatal(`no existe la base de datos: ${DB_PATH}`);

const db = new DatabaseSync(DB_PATH, { readOnly: true });

// ---------------------------------------------------------------- usuario
const users = db.prepare('SELECT id, username, email FROM users ORDER BY rowid').all();
function pickUser() {
  if (users.length === 0) fatal('la base de datos no tiene usuarios');
  if (USER_ARG) {
    const q = USER_ARG.toLowerCase();
    const found = users.find((u) => [u.id, u.username, u.email].some((v) => String(v ?? '').toLowerCase() === q));
    if (!found) fatal(`no hay ningún usuario «${USER_ARG}». Usuarios: ${users.map((u) => u.username).join(', ')}`);
    return found;
  }
  if (users.length > 1) fatal(`hay varios usuarios (${users.map((u) => u.username).join(', ')}): indica cuál con --user <nombre>`);
  return users[0];
}
const USER = pickUser();

// ---------------------------------------------------------------- catálogo
function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(HERE, file), 'utf8'));
  } catch {
    return fallback;
  }
}
const catalog = readJson('../src/data/catalog.json', []);
const legacy = readJson('../src/data/legacyIds.json', {});
const exerciseById = new Map(catalog.map((e) => [e.id, e]));
try {
  for (const e of db.prepare('SELECT id, name, muscleGroup, equipment FROM exercises WHERE user_id = ?').all(USER.id)) {
    if (!exerciseById.has(e.id)) exerciseById.set(e.id, e);
  }
} catch {
  // sin tabla de ejercicios personalizados
}
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const resolveId = (id) => legacy[id] ?? id;
const exName = (id) => exerciseById.get(resolveId(id))?.name ?? id;
const exGroup = (id) => exerciseById.get(resolveId(id))?.muscleGroup ?? 'Otro';
const isTimed = (id) => {
  const e = exerciseById.get(resolveId(id));
  return !!e && (e.hold === true || e.muscleGroup === 'Cardio');
};

// ---------------------------------------------------------------- datos
function parseJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}
function loadLogs() {
  return db
    .prepare('SELECT id, routineName, date, duration, exercises FROM logs WHERE user_id = ? ORDER BY date DESC')
    .all(USER.id)
    .map((r) => ({ ...r, exercises: parseJson(r.exercises, []) }));
}
function loadRoutines() {
  return db
    .prepare('SELECT id, name, description, dayOfWeek, folder, exercises FROM routines WHERE user_id = ?')
    .all(USER.id)
    .map((r) => ({ ...r, exercises: parseJson(r.exercises, []) }));
}
function loadUserData(key) {
  try {
    const row = db.prepare('SELECT value FROM user_data WHERE user_id = ? AND data_key = ?').get(USER.id, key);
    return row ? parseJson(row.value, null) : null;
  } catch {
    return null; // la tabla user_data solo existe si se ha desplegado el servidor nuevo
  }
}

const round1 = (n) => Math.round(n * 10) / 10;
const epley = (w, r) => (w > 0 && r > 0 ? w * (1 + r / 30) : 0);
const workingSets = (we) => (we.sets ?? []).filter((s) => s.completed && !s.isWarmup);
const DAY = 86400000;
const clamp = (v, lo, hi, d) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : d);
const dayOf = (iso) => String(iso).slice(0, 10);

function setText(id, s) {
  if (isTimed(id)) return `${s.reps} s${s.distance ? ` · ${s.distance} km` : ''}`;
  return s.weight > 0 ? `${s.weight} kg × ${s.reps}${s.rpe ? ` @${s.rpe}` : ''}` : `${s.reps} reps`;
}

// ---------------------------------------------------------------- herramientas
const TOOLS = [
  {
    name: 'resumen_general',
    description: 'Visión de conjunto del entrenamiento: nº de entrenamientos, último, sesiones por semana (8 semanas), series por grupo muscular (últimas 4 semanas frente a las 4 anteriores) y racha. Empieza por aquí.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: () => {
      const logs = loadLogs();
      const now = Date.now();
      const start = now - 56 * DAY;
      const mid = now - 28 * DAY;
      const perWeek = Array(8).fill(0);
      const recent = {};
      const previous = {};
      for (const l of logs) {
        const t = new Date(l.date).getTime();
        if (t < start) continue;
        perWeek[Math.min(7, Math.floor((t - start) / (7 * DAY)))]++;
        const target = t >= mid ? recent : previous;
        for (const we of l.exercises) {
          const n = workingSets(we).length;
          if (n) target[exGroup(we.exerciseId)] = (target[exGroup(we.exerciseId)] ?? 0) + n;
        }
      }
      const days = new Set(logs.map((l) => dayOf(l.date)));
      let streak = 0;
      for (let d = 0; d < 400; d++) {
        const key = dayOf(new Date(now - d * DAY).toISOString());
        if (days.has(key)) streak++;
        else if (d > 0) break;
      }
      return {
        usuario: USER.username,
        totalEntrenamientos: logs.length,
        ultimoEntrenamiento: logs[0] ? { fecha: dayOf(logs[0].date), nombre: logs[0].routineName } : null,
        sesionesPorSemana_de8SemanasAntiguasAReciente: perWeek,
        seriesDeTrabajoPorGrupo: { ultimas4Semanas: recent, cuatroSemanasAnteriores: previous },
        diasSeguidosEntrenando: streak,
      };
    },
  },
  {
    name: 'entrenamientos_recientes',
    description: 'Lista los entrenamientos más recientes con sus ejercicios y series.',
    inputSchema: {
      type: 'object',
      properties: {
        dias: { type: 'number', description: 'Cuántos días hacia atrás (por defecto 30, máx. 365)' },
        limite: { type: 'number', description: 'Máximo de entrenamientos (por defecto 10, máx. 40)' },
      },
      additionalProperties: false,
    },
    run: ({ dias, limite }) => {
      const since = Date.now() - clamp(dias, 1, 365, 30) * DAY;
      return loadLogs()
        .filter((l) => new Date(l.date).getTime() >= since)
        .slice(0, clamp(limite, 1, 40, 10))
        .map((l) => ({
          fecha: dayOf(l.date),
          nombre: l.routineName,
          duracionMin: Math.round((l.duration ?? 0) / 60),
          ejercicios: l.exercises
            .map((we) => ({ ejercicio: exName(we.exerciseId), series: workingSets(we).map((s) => setText(we.exerciseId, s)) }))
            .filter((e) => e.series.length > 0),
        }));
    },
  },
  {
    name: 'historial_ejercicio',
    description: 'Evolución de un ejercicio concreto: cada sesión con sus series, la mejor serie y el 1RM estimado (fórmula de Epley).',
    inputSchema: {
      type: 'object',
      properties: {
        ejercicio: { type: 'string', description: 'Nombre (o parte del nombre) o id del ejercicio, p. ej. «press de banca»' },
        limite: { type: 'number', description: 'Máximo de sesiones, de la más reciente a la más antigua (por defecto 12)' },
      },
      required: ['ejercicio'],
      additionalProperties: false,
    },
    run: ({ ejercicio, limite }) => {
      const q = norm(ejercicio);
      if (!q) return { error: 'Indica el nombre del ejercicio.' };
      const logs = loadLogs();
      const ids = new Set();
      for (const l of logs) for (const we of l.exercises) {
        const id = resolveId(we.exerciseId);
        if (id === ejercicio || norm(exName(id)).includes(q)) ids.add(id);
      }
      if (ids.size === 0) return { error: `No hay entrenamientos de «${ejercicio}». Prueba con buscar_ejercicio.` };
      if (ids.size > 6) return { error: `«${ejercicio}» coincide con demasiados ejercicios (${ids.size}); sé más concreto.`, ejemplos: [...ids].slice(0, 6).map(exName) };
      const out = [];
      for (const id of ids) {
        const sessions = [];
        let best1rm = 0;
        for (const l of logs) {
          const sets = l.exercises.filter((we) => resolveId(we.exerciseId) === id).flatMap(workingSets);
          if (sets.length === 0) continue;
          const top = sets.reduce((a, b) => (epley(b.weight, b.reps) > epley(a.weight, a.reps) ? b : a));
          const e1 = round1(epley(top.weight, top.reps));
          best1rm = Math.max(best1rm, e1);
          sessions.push({ fecha: dayOf(l.date), series: sets.map((s) => setText(id, s)), mejorSerie: setText(id, top), ...(e1 ? { e1RM: e1 } : {}) });
        }
        out.push({ ejercicio: exName(id), sesionesTotales: sessions.length, mejor1RMEstimado: best1rm || null, sesiones: sessions.slice(0, clamp(limite, 1, 60, 12)) });
      }
      return out;
    },
  },
  {
    name: 'records',
    description: 'Mejores marcas: para cada ejercicio, la serie con mayor 1RM estimado. Ordenadas de mayor a menor.',
    inputSchema: { type: 'object', properties: { limite: { type: 'number', description: 'Cuántos ejercicios (por defecto 15, máx. 50)' } }, additionalProperties: false },
    run: ({ limite }) => {
      const best = new Map();
      for (const l of loadLogs()) for (const we of l.exercises) {
        if (isTimed(we.exerciseId)) continue;
        const id = resolveId(we.exerciseId);
        for (const s of workingSets(we)) {
          const e1 = epley(s.weight, s.reps);
          if (e1 > (best.get(id)?.e1 ?? 0)) best.set(id, { e1, s, fecha: dayOf(l.date) });
        }
      }
      return [...best.entries()]
        .sort((a, b) => b[1].e1 - a[1].e1)
        .slice(0, clamp(limite, 1, 50, 15))
        .map(([id, v]) => ({ ejercicio: exName(id), mejorSerie: `${v.s.weight} kg × ${v.s.reps}`, e1RM: round1(v.e1), fecha: v.fecha }));
    },
  },
  {
    name: 'peso_corporal',
    description: 'Pesajes corporales registrados, el ritmo semanal y el objetivo de peso.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: () => {
      const entries = (loadUserData('body-weights') ?? []).filter((e) => e && typeof e.kg === 'number').sort((a, b) => a.date.localeCompare(b.date));
      if (entries.length === 0) return { mensaje: 'No hay pesajes registrados (o el servidor nuevo con «user_data» aún no está desplegado).' };
      const recent = entries.slice(-28);
      let rate = null;
      if (recent.length >= 3) {
        const x0 = new Date(recent[0].date).getTime();
        const xs = recent.map((e) => (new Date(e.date).getTime() - x0) / DAY);
        if (xs[xs.length - 1] >= 7) {
          const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
          const my = recent.reduce((a, e) => a + e.kg, 0) / recent.length;
          let num = 0, den = 0;
          xs.forEach((x, i) => { num += (x - mx) * (recent[i].kg - my); den += (x - mx) ** 2; });
          if (den) rate = Math.round((num / den) * 7 * 100) / 100;
        }
      }
      return { ultimos: entries.slice(-12), pesoActualKg: entries[entries.length - 1].kg, ritmoSemanalKg: rate, objetivo: loadUserData('body-goal') };
    },
  },
  {
    name: 'rutinas',
    description: 'Tus rutinas guardadas con sus ejercicios, series y repeticiones objetivo.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: () =>
      loadRoutines().map((r) => ({
        nombre: r.name,
        carpeta: r.folder ?? null,
        dias: r.dayOfWeek ?? null,
        ejercicios: r.exercises.map((we) => ({ ejercicio: exName(we.exerciseId), series: (we.sets ?? []).length, repsObjetivo: we.sets?.[0]?.reps ?? null, pesoRefKg: we.sets?.[0]?.weight ?? null })),
      })),
  },
  {
    name: 'buscar_ejercicio',
    description: 'Busca ejercicios del catálogo por nombre (máx. 15 resultados) para obtener su nombre exacto.',
    inputSchema: { type: 'object', properties: { texto: { type: 'string', description: 'Parte del nombre' } }, required: ['texto'], additionalProperties: false },
    run: ({ texto }) => {
      const q = norm(texto);
      if (q.length < 2) return { error: 'Escribe al menos 2 letras.' };
      return [...exerciseById.values()].filter((e) => norm(e.name).includes(q)).slice(0, 15).map((e) => ({ id: e.id, nombre: e.name, grupo: e.muscleGroup, equipamiento: e.equipment }));
    },
  },
];

// ---------------------------------------------------------------- protocolo MCP (JSON-RPC por stdio)
function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
const replyError = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined) return; // notificaciones (initialized, cancelled...): no se responde
  switch (method) {
    case 'initialize':
      return reply(id, { protocolVersion: params?.protocolVersion ?? '2024-11-05', capabilities: { tools: {} }, serverInfo: SERVER_INFO, instructions: 'Consulta de solo lectura del historial de entrenamiento de ZGym. Empieza por «resumen_general». Las cifras son del usuario; no des consejo médico.' });
    case 'ping':
      return reply(id, {});
    case 'tools/list':
      return reply(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) return replyError(id, -32602, `Herramienta desconocida: ${params?.name}`);
      try {
        const data = tool.run(params?.arguments ?? {});
        return reply(id, { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
      } catch (err) {
        return reply(id, { isError: true, content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }] });
      }
    }
    default:
      return replyError(id, -32601, `Método no soportado: ${method}`);
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON no válido' } });
  }
  handle(msg);
});
rl.on('close', () => process.exit(0));
process.stderr.write(`zgym-mcp listo (solo lectura) · usuario ${USER.username} · ${path.basename(DB_PATH)}\n`);
