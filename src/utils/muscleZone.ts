import { Exercise } from '../types';

export type MuscleZone =
  | 'upper-chest' | 'mid-chest' | 'lower-chest'
  | 'front-deltoid' | 'lateral-deltoid' | 'rear-deltoid'
  | 'biceps' | 'triceps' | 'forearm'
  | 'abs' | 'obliques'
  | 'lats' | 'mid-back' | 'lower-back'
  | 'quadriceps' | 'hamstrings' | 'glutes' | 'calves'
  // Zonas del catálogo importado que antes no existían
  | 'trapezius' | 'serratus' | 'adductors' | 'abductors'
  | 'neck' | 'full-body' | 'cardio';

// Una imagen fija por zona (no una silueta genérica por grupo muscular
// completo), para que dos ejercicios del mismo grupo que trabajan porciones
// distintas (ej. "Press inclinado" vs. "Cruces en polea baja", ambos Pecho)
// muestren cada uno la zona exacta.
// Solo las 18 zonas originales tienen imagen .webp propia. Las zonas nuevas se
// dibujan con la silueta (ver components/MuscleZoneImage.tsx), así que aquí el
// registro es parcial a propósito: tsc obliga a pasar por ese componente.
export const MUSCLE_ZONE_IMAGE: Partial<Record<MuscleZone, string>> = {
  'upper-chest': '/muscle-anatomy/upper-chest.webp',
  'mid-chest': '/muscle-anatomy/mid-chest.webp',
  'lower-chest': '/muscle-anatomy/lower-chest.webp',
  'front-deltoid': '/muscle-anatomy/front-deltoid.webp',
  'lateral-deltoid': '/muscle-anatomy/lateral-deltoid.webp',
  'rear-deltoid': '/muscle-anatomy/rear-deltoid.webp',
  biceps: '/muscle-anatomy/biceps.webp',
  triceps: '/muscle-anatomy/triceps.webp',
  forearm: '/muscle-anatomy/forearm.webp',
  abs: '/muscle-anatomy/abs.webp',
  obliques: '/muscle-anatomy/obliques.webp',
  lats: '/muscle-anatomy/lats.webp',
  'mid-back': '/muscle-anatomy/mid-back.webp',
  'lower-back': '/muscle-anatomy/lower-back.webp',
  quadriceps: '/muscle-anatomy/quadriceps.webp',
  hamstrings: '/muscle-anatomy/hamstrings.webp',
  glutes: '/muscle-anatomy/glutes.webp',
  calves: '/muscle-anatomy/calves.webp',
};

export const MUSCLE_ZONE_LABEL: Record<MuscleZone, string> = {
  'upper-chest': 'Pecho Superior',
  'mid-chest': 'Pecho Medio',
  'lower-chest': 'Pecho Inferior',
  'front-deltoid': 'Deltoides Anterior',
  'lateral-deltoid': 'Deltoides Lateral',
  'rear-deltoid': 'Deltoides Posterior',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearm: 'Antebrazo',
  abs: 'Abdomen',
  obliques: 'Oblicuos',
  lats: 'Dorsales',
  'mid-back': 'Espalda Media',
  'lower-back': 'Zona Lumbar',
  quadriceps: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  glutes: 'Glúteos',
  calves: 'Pantorrillas',
  trapezius: 'Trapecio',
  serratus: 'Serrato',
  adductors: 'Aductores',
  abductors: 'Abductores',
  neck: 'Cuello',
  'full-body': 'Cuerpo completo',
  cardio: 'Cardio',
};

// Sub-músculos (zonas) que pertenecen a cada grupo muscular, en orden
// anatómico lógico. Se usa para el filtro de segundo nivel de la biblioteca:
// tras elegir un grupo, se ofrecen sus zonas concretas.
export const MUSCLE_GROUP_ZONES: Record<Exercise['muscleGroup'], MuscleZone[]> = {
  Pecho: ['upper-chest', 'mid-chest', 'lower-chest', 'serratus'],
  Espalda: ['lats', 'mid-back', 'lower-back', 'trapezius'],
  Piernas: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'],
  Hombros: ['front-deltoid', 'lateral-deltoid', 'rear-deltoid', 'trapezius'],
  Brazos: ['biceps', 'triceps', 'forearm'],
  Abdomen: ['abs', 'obliques', 'serratus'],
  Cuello: ['neck'],
  'Cuerpo completo': ['full-body'],
  Cardio: ['cardio'],
};

// Grupo "natural" de cada zona, para clasificar cuando solo se conoce la zona.
export const ZONE_PRIMARY_GROUP: Record<MuscleZone, Exercise['muscleGroup']> = {
  'upper-chest': 'Pecho', 'mid-chest': 'Pecho', 'lower-chest': 'Pecho', serratus: 'Pecho',
  'front-deltoid': 'Hombros', 'lateral-deltoid': 'Hombros', 'rear-deltoid': 'Hombros',
  biceps: 'Brazos', triceps: 'Brazos', forearm: 'Brazos',
  abs: 'Abdomen', obliques: 'Abdomen',
  lats: 'Espalda', 'mid-back': 'Espalda', 'lower-back': 'Espalda', trapezius: 'Espalda',
  quadriceps: 'Piernas', hamstrings: 'Piernas', glutes: 'Piernas', calves: 'Piernas',
  adductors: 'Piernas', abductors: 'Piernas',
  neck: 'Cuello', 'full-body': 'Cuerpo completo', cardio: 'Cardio',
};

// Detecta la zona muscular exacta a partir del grupo muscular + palabras
// clave del nombre del ejercicio (mismas reglas que antes usaban los SVG
// generados, más 3 zonas que antes no tenían detección propia y caían por
// defecto en la imagen equivocada: isquiotibiales, antebrazo y oblicuos).
export function detectMuscleZone(exercise: Exercise): MuscleZone {
  // Override explícito: para ejercicios cuyo nombre engañaría a la detección
  // (p. ej. "Patada de glúteo" que se quiere clasificar como isquiotibiales).
  if (exercise.zone && exercise.zone in MUSCLE_ZONE_LABEL) {
    return exercise.zone as MuscleZone;
  }

  // Grupos que no son un músculo concreto: su zona es la del propio grupo.
  if (exercise.muscleGroup === 'Cuello') return 'neck';
  if (exercise.muscleGroup === 'Cuerpo completo') return 'full-body';
  if (exercise.muscleGroup === 'Cardio') return 'cardio';

  const n = exercise.name.toLowerCase();

  const isUpper = n.includes('inclinado') || n.includes('superior') || n.includes('alto') || n.includes('incline');
  const isLower = n.includes('declinado') || n.includes('inferior') || n.includes('bajo') || n.includes('fondos') || n.includes('decline');
  const isDeadlift = n.includes('muerto') || n.includes('deadlift');
  const isRow = n.includes('remo') || n.includes('row');
  const isTricep = exercise.muscleGroup === 'Brazos' && (n.includes('trícep') || n.includes('fondos') || n.includes('copa') || n.includes('rompecráneos') || n.includes('skull') || n.includes('kickback') || n.includes('patada') || n.includes('press cerrado'));
  const isForearm = n.includes('antebrazo') || n.includes('muñeca') || n.includes('forearm') || n.includes('wrist');
  const isCalf = n.includes('pantorrilla') || n.includes('calves') || n.includes('gemelos') || n.includes('gemelo') || n.includes('calf') || n.includes('talón') || n.includes('talon') || n.includes('talones');
  const isGlute = n.includes('glúteo') || n.includes('hip thrust') || n.includes('puente');
  const isHamstring = n.includes('femoral') || n.includes('isquio') || n.includes('hamstring') || n.includes('rumano') || n.includes('romanian') || n.includes('nordic') || n.includes('buenos días') || n.includes('good morning');
  const isLateral = n.includes('lateral') || n.includes('vuelos') || n.includes('raises') || n.includes('deltoides lateral');
  // Nota: NO se usa el keyword suelto 'invertido'. En español "invertido"
  // suele significar "agarre invertido" (supino) de press de banca, curl,
  // remo, crunch..., NO "reverse fly" de deltoides posterior. Incluirlo
  // mandaba 29 ejercicios de pecho/abdomen/brazos/espalda a la imagen del
  // deltoides posterior por error. Los verdaderos ejercicios de deltoides
  // posterior se detectan por 'posterior'/'pájaro'/'face pull'/'rear'.
  const isRearDelt = n.includes('posterior') || n.includes('pájaro') || n.includes('face pull') || n.includes('rear');
  const isObliques = n.includes('oblicuo') || n.includes('oblique') || n.includes('giro ruso') || n.includes('russian twist') || n.includes('torsión') || n.includes('torsion') || n.includes('leñador') || n.includes('woodchopper');

  if (exercise.muscleGroup === 'Piernas') {
    if (isCalf) return 'calves';
    if (isGlute) return 'glutes';
    if (isHamstring) return 'hamstrings';
    return 'quadriceps';
  }

  if (exercise.muscleGroup === 'Espalda' || isRearDelt || isTricep) {
    if (isTricep) return 'triceps';
    if (isRearDelt) return 'rear-deltoid';
    if (isDeadlift) return 'lower-back';
    if (isRow) return 'mid-back';
    return 'lats';
  }

  if (exercise.muscleGroup === 'Pecho') {
    if (isUpper) return 'upper-chest';
    if (isLower) return 'lower-chest';
    return 'mid-chest';
  }

  if (exercise.muscleGroup === 'Hombros') {
    if (isLateral) return 'lateral-deltoid';
    return 'front-deltoid';
  }

  if (exercise.muscleGroup === 'Brazos') {
    if (isForearm) return 'forearm';
    return 'biceps';
  }

  // Abdomen y cualquier grupo no contemplado
  if (isObliques) return 'obliques';
  return 'abs';
}
