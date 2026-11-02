import type { Exercise, WorkoutLog } from '../types';
import type { ProgressionRule } from './progressionRules';
import type { BodyGoal, BodyWeightEntry } from './userData';
import { buildCoachSummary } from './coachSummary';
import { goalStatus, weeklyRateKg } from './bodyWeight';

// Texto listo para pegar en cualquier IA (Claude, ChatGPT, Gemini...): las
// instrucciones y un resumen de tus últimas 8 semanas. No incluye tu nombre, tu
// correo ni el historial entero: solo cifras agregadas.

const GOAL_LABEL: Record<BodyGoal['mode'], string> = { lose: 'perder peso', gain: 'ganar peso', hold: 'mantener el peso' };

export interface AiExportOptions {
  logs: WorkoutLog[];
  exercises: Exercise[];
  rules: ProgressionRule[];
  bodyWeights?: BodyWeightEntry[];
  goal?: BodyGoal | null;
  /** Lo que quieres saber; si va vacío se pide un análisis general. */
  question?: string;
  now?: Date;
}

export function buildAiExport({ logs, exercises, rules, bodyWeights = [], goal = null, question = '', now = new Date() }: AiExportOptions): string {
  const summary = buildCoachSummary(logs, exercises, rules);

  const body: Record<string, unknown> | null =
    bodyWeights.length === 0
      ? null
      : (() => {
          const today = now.toISOString().slice(0, 10);
          const rate = weeklyRateKg(bodyWeights, today);
          const status = goal ? goalStatus(bodyWeights, goal, today) : null;
          return {
            ultimosPesajes: bodyWeights.slice(-12).map((e) => ({ fecha: e.date, kg: e.kg })),
            ritmoSemanalKg: rate,
            objetivo: goal ? { tipo: GOAL_LABEL[goal.mode], pesoObjetivoKg: goal.targetKg, ritmoPrevistoKgSemana: goal.plannedRateKg ?? null } : null,
            faltanKg: status ? status.remainingKg : null,
          };
        })();

  const data = { ...summary, ...(body ? { pesoCorporal: body } : {}) };
  const ask = question.trim() || 'Haz un análisis general de mi entrenamiento y dime qué debería cambiar.';

  return [
    'Actúa como un entrenador personal y preparador de fuerza con experiencia. Te paso un resumen de mis últimas 8 semanas de entrenamiento en formato JSON (las cifras de series son series de trabajo, sin calentamientos; el 1RM es una estimación con la fórmula de Epley).',
    '',
    'Qué necesito:',
    `- ${ask}`,
    '',
    'Cómo quiero la respuesta:',
    '- En español, clara y sin relleno.',
    '- Señala estancamientos, músculos descuidados o con demasiado volumen, y si descanso y frecuencia parecen adecuados.',
    '- Da cambios concretos y pequeños que pueda aplicar en mis rutinas (series, repeticiones, peso, frecuencia), explicando el porqué de cada uno.',
    '- Si faltan datos para concluir algo, dilo en vez de inventarlo.',
    '- No des consejo médico: ante dolor, lesión o dieta, recomiéndame consultar a un profesional.',
    '',
    'Mis datos:',
    '```json',
    JSON.stringify(data, null, 2),
    '```',
    '',
  ].join('\n');
}
