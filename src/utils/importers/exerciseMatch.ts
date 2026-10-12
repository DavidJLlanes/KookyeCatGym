import { Exercise } from '../../types';

type MuscleGroup = Exercise['muscleGroup'];
type Equipment = Exercise['equipment'];

// Expresiones de varias palabras primero: se traducen antes que las sueltas.
const PHRASES: [RegExp, string][] = [
  [/romanian deadlift|rdl/g, 'peso muerto rumano'],
  [/stiff leg(ged)? deadlift/g, 'peso muerto piernas rigidas'],
  [/deadlift/g, 'peso muerto'],
  [/bench press/g, 'press banca'],
  [/overhead press|military press|ohp/g, 'press militar'],
  [/shoulder press/g, 'press hombro'],
  [/leg press/g, 'prensa piernas'],
  [/leg extension/g, 'extension cuadriceps'],
  [/(lying |seated )?leg curl|hamstring curl/g, 'curl femoral'],
  [/lat pulldown|pulldown/g, 'jalon pecho'],
  [/^(back )?squat\b/g, 'sentadilla completa'],
  [/chin ?ups?/g, 'dominada supina'],
  [/pull ?ups?/g, 'dominada'],
  [/push ?ups?/g, 'flexiones'],
  [/chest fly|pec deck|flyes?|flys?/g, 'aperturas'],
  [/lateral raise/g, 'elevacion lateral'],
  [/front raise/g, 'elevacion frontal'],
  [/calf raise/g, 'elevacion talones gemelos'],
  [/hip thrust/g, 'hip thrust'],
  [/face pull/g, 'face pull'],
  [/skull ?crushers?/g, 'rompecraneos'],
  [/triceps? pushdown|pushdown/g, 'extension triceps polea'],
  [/triceps? extension/g, 'extension triceps'],
  [/preacher curl/g, 'curl predicador'],
  [/hammer curl/g, 'curl martillo'],
  [/bent over row/g, 'remo inclinado'],
  [/seated (cable )?row/g, 'remo sentado'],
  [/front squat/g, 'sentadilla frontal'],
  [/split squat/g, 'sentadilla bulgara'],
  [/good morning/g, 'buenos dias'],
  [/single arm|one arm/g, 'unilateral'],
];

const WORDS: Record<string, string> = {
  barbell: 'barra', bar: 'barra', dumbbell: 'mancuerna', dumbbells: 'mancuerna', cable: 'polea',
  machine: 'maquina', smith: 'smith', incline: 'inclinado', decline: 'declinado', flat: 'plano',
  squat: 'sentadilla', squats: 'sentadilla', row: 'remo', rows: 'remo', curl: 'curl', curls: 'curl',
  press: 'press', bench: 'banca', crunch: 'crunch', crunches: 'crunch', plank: 'plancha',
  lunge: 'zancada', lunges: 'zancada', dip: 'fondos', dips: 'fondos', shrug: 'encogimiento',
  shrugs: 'encogimiento', triceps: 'triceps', tricep: 'triceps', biceps: 'biceps', bicep: 'biceps',
  extension: 'extension', raise: 'elevacion', lateral: 'lateral', rear: 'posterior',
  reverse: 'invertido', seated: 'sentado', standing: 'pie', glute: 'gluteo', glutes: 'gluteo',
  hamstring: 'femoral', calf: 'gemelos', calves: 'gemelos', abs: 'abdominal', pullover: 'pullover',
  kickback: 'patada', bulgarian: 'bulgara', goblet: 'goblet', hack: 'hack', chest: 'pecho',
  back: 'espalda', shoulder: 'hombro', leg: 'pierna', legs: 'pierna', wrist: 'muneca',
};

const STOPWORDS = new Set(['de', 'del', 'con', 'en', 'la', 'el', 'los', 'las', 'a', 'al', 'y', 'the', 'with', 'on', 'of']);

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Raíz burda para que "mancuernas"/"mancuerna" o "inclinado"/"inclinada" coincidan
const stem = (t: string) => t.replace(/(es|s)$/, '').replace(/[ao]$/, '');

// Nombre normalizado con los términos en inglés pasados a español
function translated(name: string): string {
  let text = normalize(name);
  for (const [re, es] of PHRASES) text = text.replace(re, ` ${es} `);
  return text
    .split(' ')
    .map((w) => WORDS[w] ?? w)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(name: string, translate: boolean): Set<string> {
  const text = translate ? translated(name) : normalize(name);
  return new Set(
    text
      .split(' ')
      .filter((t) => t && !STOPWORDS.has(t))
      .map(stem)
  );
}

export interface ExerciseCandidate {
  exercise: Exercise;
  score: number;
}

/** Ejercicios de la biblioteca ordenados por parecido con el nombre importado. */
export function rankExercises(importedName: string, library: Exercise[], limit = 5): ExerciseCandidate[] {
  const src = tokens(importedName, true);
  if (src.size === 0) return [];
  const exact = normalize(importedName);

  return library
    .map((exercise) => {
      if (normalize(exercise.name) === exact) return { exercise, score: 1 };
      const dst = tokens(exercise.name, false);
      let common = 0;
      src.forEach((t) => dst.has(t) && common++);
      return { exercise, score: (2 * common) / (src.size + dst.size) };
    })
    .filter((c) => c.score > 0)
    // A igualdad de parecido, el nombre más corto suele ser la variante básica
    .sort((a, b) => b.score - a.score || a.exercise.name.length - b.exercise.name.length)
    .slice(0, limit);
}

// Por encima de este parecido se propone el emparejamiento por defecto
export const AUTO_MATCH_SCORE = 0.6;

const GROUP_KEYWORDS: [MuscleGroup, RegExp][] = [
  ['Pecho', /banca|aperturas|pecho|flexiones|chest/],
  ['Espalda', /remo|jalon|dominada|espalda|peso muerto|pullover|back/],
  ['Piernas', /sentadilla|prensa|zancada|femoral|cuadriceps|gemelos|gluteo|hip thrust|pierna|leg/],
  ['Hombros', /press militar|hombro|elevacion lateral|elevacion frontal|face pull|posterior|shoulder/],
  ['Brazos', /curl|triceps|biceps|fondos|rompecraneos|muneca|arm/],
  ['Abdomen', /crunch|plancha|abdominal|core|oblicuo/],
];

const CATEGORY_GROUP: Record<string, MuscleGroup> = {
  chest: 'Pecho', back: 'Espalda', legs: 'Piernas', shoulders: 'Hombros',
  biceps: 'Brazos', triceps: 'Brazos', arms: 'Brazos', forearms: 'Brazos', abs: 'Abdomen', core: 'Abdomen',
};

/** Grupo muscular probable para crear un ejercicio personalizado. */
export function guessMuscleGroup(importedName: string, category?: string): MuscleGroup {
  const fromCategory = category ? CATEGORY_GROUP[normalize(category)] : undefined;
  if (fromCategory) return fromCategory;
  const text = translated(importedName);
  return GROUP_KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? 'Pecho';
}

export function guessEquipment(importedName: string): Equipment {
  const text = translated(importedName);
  if (/barr/.test(text)) return 'Barra';
  if (/mancuern/.test(text)) return 'Mancuernas';
  if (/pole/.test(text)) return 'Polea';
  if (/maquin|smith|prensa/.test(text)) return 'Máquina';
  return 'Peso Corporal';
}
