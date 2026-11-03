import type { Exercise, Routine, WorkoutExercise } from '../types';

// Planes de iniciación: rutinas clásicas ya montadas con ejercicios del
// catálogo. Se añaden como rutinas normales, que luego se editan como cualquier
// otra. Los pesos van a 0: la primera vez los apuntas tú y, a partir de ahí, la
// app rellena lo de la última sesión.

interface PlanExercise {
  id: string; // id del catálogo (src/data/catalog.json)
  sets: number;
  reps: number; // repeticiones objetivo (o segundos si el ejercicio es "de mantener")
  rest: number; // descanso en segundos
}

interface PlanRoutine {
  name: string;
  description: string;
  day: string;
  exercises: PlanExercise[];
}

export interface StarterPlan {
  id: string;
  name: string;
  tagline: string;
  daysPerWeek: string;
  level: string;
  routines: PlanRoutine[];
}

const SQUAT = '1436'; // Sentadilla con barra alta
const BENCH = '0025'; // Press de banca con barra
const INCLINE_DB = '0314'; // Press de banca inclinado con mancuernas
const OHP = '1162'; // Press militar de pie con barra
const DEADLIFT = '0032'; // Peso muerto con barra
const RDL = '0085'; // Peso muerto rumano con barra
const ROW = '0027'; // Remo con barra inclinado
const PULLUP = '0652'; // Dominadas
const PULLDOWN = '0198'; // Jalón al pecho
const FACE_PULL = '5609'; // Face pull de pie en polea
const LEG_PRESS = '0739'; // Prensa de piernas a 45°
const LEG_CURL = '0599'; // Curl de piernas sentado en máquina
const CALF = '0594'; // Elevación de gemelos sentado en máquina
const LATERAL = '0334'; // Elevaciones laterales con mancuernas
const TRI_ROPE = '0200'; // Extensión de tríceps en polea alta con cuerda
const BARBELL_CURL = '0031'; // Curl de bíceps con barra
const DB_CURL = '0416'; // Curl de bíceps con mancuernas
const HAMMER = '0313'; // Curl martillo con mancuernas
const PLANK = '0463'; // Plancha frontal

const compound = (id: string, sets: number, reps: number): PlanExercise => ({ id, sets, reps, rest: 150 });
const accessory = (id: string, sets: number, reps: number): PlanExercise => ({ id, sets, reps, rest: 75 });

export const STARTER_PLANS: StarterPlan[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    tagline: 'Empuje, tirón y piernas. Cada día trabaja un bloque de músculos.',
    daysPerWeek: '3 a 6 días (se repite el ciclo)',
    level: 'Intermedio',
    routines: [
      {
        name: 'Push (empuje)',
        description: 'Pecho, hombros y tríceps.',
        day: 'Lunes',
        exercises: [compound(BENCH, 4, 6), compound(OHP, 3, 8), accessory(INCLINE_DB, 3, 10), accessory(LATERAL, 3, 15), accessory(TRI_ROPE, 3, 12)],
      },
      {
        name: 'Pull (tirón)',
        description: 'Espalda, hombro posterior y bíceps.',
        day: 'Miércoles',
        exercises: [compound(PULLUP, 4, 6), compound(ROW, 3, 8), accessory(PULLDOWN, 3, 10), accessory(FACE_PULL, 3, 15), accessory(BARBELL_CURL, 3, 10), accessory(HAMMER, 3, 12)],
      },
      {
        name: 'Legs (piernas)',
        description: 'Cuádriceps, femorales, glúteos y gemelos.',
        day: 'Viernes',
        exercises: [compound(SQUAT, 4, 6), compound(RDL, 3, 8), accessory(LEG_PRESS, 3, 10), accessory(LEG_CURL, 3, 12), accessory(CALF, 4, 12), accessory(PLANK, 3, 45)],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Torso / Pierna',
    tagline: 'Dos sesiones que se alternan: parte superior e inferior.',
    daysPerWeek: '4 días (Torso, Pierna, Torso, Pierna)',
    level: 'Principiante-intermedio',
    routines: [
      {
        name: 'Torso',
        description: 'Pecho, espalda, hombros y brazos.',
        day: 'Lunes y Jueves',
        exercises: [compound(BENCH, 4, 6), compound(ROW, 4, 8), accessory(OHP, 3, 8), accessory(PULLDOWN, 3, 10), accessory(DB_CURL, 3, 12), accessory(TRI_ROPE, 3, 12)],
      },
      {
        name: 'Pierna',
        description: 'Piernas completas y abdomen.',
        day: 'Martes y Viernes',
        exercises: [compound(SQUAT, 4, 6), compound(RDL, 3, 8), accessory(LEG_PRESS, 3, 10), accessory(LEG_CURL, 3, 12), accessory(CALF, 4, 12), accessory(PLANK, 3, 45)],
      },
    ],
  },
  {
    id: 'full-body',
    name: 'Cuerpo completo',
    tagline: 'Todo el cuerpo en cada sesión, con dos sesiones que se alternan.',
    daysPerWeek: '3 días (A, B, A / B, A, B)',
    level: 'Principiante',
    routines: [
      {
        name: 'Cuerpo completo A',
        description: 'Sentadilla, press de banca y remo.',
        day: 'Lunes y Viernes',
        exercises: [compound(SQUAT, 3, 8), compound(BENCH, 3, 8), compound(ROW, 3, 8), accessory(LATERAL, 3, 15), accessory(PLANK, 3, 45)],
      },
      {
        name: 'Cuerpo completo B',
        description: 'Peso muerto, press militar y jalón.',
        day: 'Miércoles',
        exercises: [compound(DEADLIFT, 3, 5), compound(OHP, 3, 8), accessory(PULLDOWN, 3, 10), accessory(LEG_PRESS, 3, 10), accessory(DB_CURL, 3, 12)],
      },
    ],
  },
  {
    id: 'five-by-five',
    name: '5×5',
    tagline: 'Pocos ejercicios, pesados, 5 series de 5. Subes un poco cada sesión.',
    daysPerWeek: '3 días (A, B, A / B, A, B)',
    level: 'Principiante',
    routines: [
      {
        name: '5×5 · A',
        description: 'Sentadilla, press de banca y remo con barra.',
        day: 'Lunes y Viernes',
        exercises: [compound(SQUAT, 5, 5), compound(BENCH, 5, 5), compound(ROW, 5, 5)],
      },
      {
        name: '5×5 · B',
        description: 'Sentadilla, press militar y peso muerto.',
        day: 'Miércoles',
        exercises: [compound(SQUAT, 5, 5), compound(OHP, 5, 5), compound(DEADLIFT, 1, 5)],
      },
    ],
  },
];

/** Todos los ids de ejercicio que usan los planes (para comprobar que existen en el catálogo). */
export function starterPlanExerciseIds(): string[] {
  return [...new Set(STARTER_PLANS.flatMap((p) => p.routines.flatMap((r) => r.exercises.map((e) => e.id))))];
}

let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now()}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * Convierte un plan en rutinas listas para guardar, dentro de una carpeta con
 * el nombre del plan. Los ejercicios que no estén en el catálogo se omiten (y
 * se devuelven en `missing`, por si algún día cambia un id).
 */
export function instantiateStarterPlan(plan: StarterPlan, exercises: Exercise[]): { routines: Routine[]; missing: string[] } {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const missing: string[] = [];
  const routines: Routine[] = plan.routines.map((r, ri) => {
    const list: WorkoutExercise[] = [];
    for (const pe of r.exercises) {
      const ex = byId.get(pe.id);
      if (!ex) {
        missing.push(pe.id);
        continue;
      }
      list.push({
        id: uid('we-plan'),
        exerciseId: ex.id,
        restTime: pe.rest,
        sets: Array.from({ length: pe.sets }, () => ({ id: uid('set-plan'), weight: 0, reps: pe.reps, completed: false })),
      });
    }
    return {
      id: uid('routine-plan'),
      name: r.name,
      description: r.description,
      dayOfWeek: r.day,
      folder: plan.name,
      sortOrder: ri,
      exercises: list,
    };
  });
  return { routines: routines.filter((r) => r.exercises.length > 0), missing };
}
