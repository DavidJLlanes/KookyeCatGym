import type { Program, ProgramWeek } from '../utils/programs';

// Programas predefinidos: varias semanas con la carga de cada una calculada a
// partir de tu máximo de entrenamiento (un % de lo que levantas). Los diseños
// son propios y usan esquemas de series/repeticiones/% habituales en fuerza e
// hipertrofia; no copian ningún programa comercial concreto.

// Ejercicios del catálogo (src/data/catalog.json)
const SQUAT = '1436'; // Sentadilla con barra alta
const BENCH = '0025'; // Press de banca con barra
const INCLINE_DB = '0314'; // Press de banca inclinado con mancuernas
const OHP = '1162'; // Press militar de pie con barra
const DEADLIFT = '0032'; // Peso muerto con barra
const RDL = '0085'; // Peso muerto rumano con barra
const ROW = '0027'; // Remo con barra inclinado
const PULLDOWN = '0198'; // Jalón al pecho
const FACE_PULL = '5609'; // Face pull de pie en polea
const LEG_PRESS = '0739'; // Prensa de piernas a 45°
const LEG_CURL = '0599'; // Curl de piernas sentado en máquina
const CALF = '0594'; // Elevación de gemelos sentado en máquina
const LATERAL = '0334'; // Elevaciones laterales con mancuernas
const TRI_ROPE = '0200'; // Extensión de tríceps en polea alta con cuerda
const BARBELL_CURL = '0031'; // Curl de bíceps con barra
const PLANK = '0463'; // Plancha frontal

const main = (exerciseId: string, rest = 180, sets?: number) => ({ exerciseId, main: true, rest, ...(sets ? { sets } : {}) });
const acc = (exerciseId: string, sets: number, reps: number, rest = 75) => ({ exerciseId, main: false, rest, sets, reps });

const sets = (count: number, reps: number, percent: number) => Array.from({ length: count }, () => ({ reps, percent }));

/** Semanas con el mismo esquema de series de trabajo. */
const week = (label: string, scheme: ProgramWeek['scheme'], extra: Partial<ProgramWeek> = {}): ProgramWeek => ({ label, scheme, ...extra });

export const PROGRAMS: Program[] = [
  {
    id: 'waves-4',
    name: 'Fuerza en olas',
    tagline: 'Cuatro semanas de carga creciente (5, 3 y 1 repeticiones) y una de descarga, con un levantamiento principal cada día.',
    level: 'Intermedio',
    days: [
      { name: 'Sentadilla', exercises: [main(SQUAT), acc(LEG_PRESS, 3, 10), acc(LEG_CURL, 3, 10), acc(CALF, 3, 12, 60)] },
      { name: 'Press de banca', exercises: [main(BENCH), acc(ROW, 4, 8), acc(TRI_ROPE, 3, 12, 60), acc(FACE_PULL, 3, 15, 60)] },
      { name: 'Peso muerto', exercises: [main(DEADLIFT, 210, 3), acc(PULLDOWN, 4, 10), acc(RDL, 3, 8), acc(PLANK, 3, 45, 60)] },
      { name: 'Press militar', exercises: [main(OHP), acc(INCLINE_DB, 3, 10), acc(LATERAL, 4, 15, 60), acc(BARBELL_CURL, 3, 10, 60)] },
    ],
    weeks: [
      week('Semana de 5', [{ reps: 5, percent: 65 }, { reps: 5, percent: 75 }, { reps: 5, percent: 85 }]),
      week('Semana de 3', [{ reps: 3, percent: 70 }, { reps: 3, percent: 80 }, { reps: 3, percent: 90 }]),
      week('Semana de 1', [{ reps: 5, percent: 75 }, { reps: 3, percent: 85 }, { reps: 1, percent: 95 }]),
      week('Descarga', [{ reps: 5, percent: 40 }, { reps: 5, percent: 50 }, { reps: 5, percent: 60 }], { deload: true }),
    ],
  },
  {
    id: 'fullbody-hyp-6',
    name: 'Cuerpo completo para hipertrofia',
    tagline: 'Tres días por semana alternando dos sesiones de cuerpo completo; seis semanas con más carga cada una y descarga al final.',
    level: 'Principiante / intermedio',
    days: [
      { name: 'Cuerpo completo A', exercises: [main(SQUAT, 150), main(BENCH, 150), acc(PULLDOWN, 3, 10), acc(LEG_CURL, 3, 12, 60), acc(PLANK, 3, 40, 60)] },
      { name: 'Cuerpo completo B', exercises: [main(DEADLIFT, 180, 2), main(OHP, 150), acc(ROW, 3, 10), acc(LATERAL, 3, 15, 60), acc(BARBELL_CURL, 3, 12, 60)] },
      { name: 'Cuerpo completo C', exercises: [main(SQUAT, 150), main(BENCH, 150), acc(ROW, 3, 10), acc(TRI_ROPE, 3, 12, 60), acc(CALF, 3, 15, 60)] },
    ],
    weeks: [
      week('Semana 1', sets(3, 10, 65)),
      week('Semana 2', sets(3, 10, 67.5)),
      week('Semana 3', sets(4, 8, 70)),
      week('Semana 4', sets(4, 8, 72.5)),
      week('Semana 5', sets(4, 6, 77.5)),
      week('Descarga', sets(2, 8, 55), { deload: true }),
    ],
  },
  {
    id: 'linear-5x5',
    name: 'Fuerza lineal 5×5',
    tagline: 'Para empezar: dos sesiones que se alternan tres días por semana, con 5×5 y un pequeño aumento de carga cada semana.',
    level: 'Principiante',
    days: [
      { name: 'Día A', exercises: [main(SQUAT, 180), main(BENCH, 180), main(ROW, 150)] },
      { name: 'Día B', exercises: [main(SQUAT, 180), main(OHP, 150), main(DEADLIFT, 210, 1)] },
    ],
    weeks: [
      week('Semana 1', sets(5, 5, 70)),
      week('Semana 2', sets(5, 5, 72.5)),
      week('Semana 3', sets(5, 5, 75)),
      week('Semana 4', sets(5, 5, 77.5)),
      week('Semana 5', sets(5, 5, 80)),
      week('Semana 6', sets(5, 5, 82.5)),
      week('Semana 7', sets(5, 5, 85)),
      week('Descarga', sets(3, 5, 60), { deload: true }),
    ],
  },
];
