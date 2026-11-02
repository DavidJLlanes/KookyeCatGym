import { Routine, WorkoutLog, WorkoutExercise, WorkoutSet } from '../types';

// Helper to create a UUID-like random string
const uuid = () => Math.random().toString(36).substring(2, 11);

// Helper to generate dates relative to current date (July 3, 2026)
const getDateDaysAgo = (daysAgo: number): string => {
  const date = new Date('2026-07-03T09:00:00Z');
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

// Rutinas predeterminadas inspiradas en los splits semanales de 5 leyendas
// del culturismo, agrupadas en carpetas con el nombre de cada atleta.
export const DEFAULT_ROUTINES: Routine[] = [
  {
    id: 'routine-arnold-pecho-espalda',
    name: 'Arnold: Pecho y Espalda',
    description: 'La "Rutina Básica de Masa" de Arnold (New Encyclopedia of Modern Bodybuilding): pecho y espalda combinados con superseries antagonistas, entrenados dos veces por semana.',
    dayOfWeek: 'Lunes y Jueves',
    folder: 'Arnold Schwarzenegger',
    exercises: [
      {
        id: 'we-arnold-pecho-espalda-0',
        exerciseId: '0025',
        restTime: 120,
        sets: [
          { id: 's-arnold-pecho-espalda-0-0', weight: 70, reps: 10, completed: false },
          { id: 's-arnold-pecho-espalda-0-1', weight: 70, reps: 10, completed: false },
          { id: 's-arnold-pecho-espalda-0-2', weight: 70, reps: 10, completed: false },
          { id: 's-arnold-pecho-espalda-0-3', weight: 70, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-pecho-espalda-1',
        exerciseId: '0047',
        restTime: 120,
        sets: [
          { id: 's-arnold-pecho-espalda-1-0', weight: 60, reps: 10, completed: false },
          { id: 's-arnold-pecho-espalda-1-1', weight: 60, reps: 10, completed: false },
          { id: 's-arnold-pecho-espalda-1-2', weight: 60, reps: 10, completed: false },
          { id: 's-arnold-pecho-espalda-1-3', weight: 60, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-pecho-espalda-2',
        exerciseId: '9XjtHvS',
        restTime: 75,
        sets: [
          { id: 's-arnold-pecho-espalda-2-0', weight: 20, reps: 10, completed: false },
          { id: 's-arnold-pecho-espalda-2-1', weight: 20, reps: 10, completed: false },
          { id: 's-arnold-pecho-espalda-2-2', weight: 20, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-pecho-espalda-3',
        exerciseId: '0651',
        restTime: 120,
        sets: [
          { id: 's-arnold-pecho-espalda-3-0', weight: 0, reps: 10, completed: false },
          { id: 's-arnold-pecho-espalda-3-1', weight: 0, reps: 10, completed: false },
          { id: 's-arnold-pecho-espalda-3-2', weight: 0, reps: 10, completed: false },
          { id: 's-arnold-pecho-espalda-3-3', weight: 0, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-pecho-espalda-4',
        exerciseId: 'eZyBC3j',
        restTime: 90,
        sets: [
          { id: 's-arnold-pecho-espalda-4-0', weight: 60, reps: 10, completed: false },
          { id: 's-arnold-pecho-espalda-4-1', weight: 60, reps: 10, completed: false },
          { id: 's-arnold-pecho-espalda-4-2', weight: 60, reps: 10, completed: false },
          { id: 's-arnold-pecho-espalda-4-3', weight: 60, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-pecho-espalda-5',
        exerciseId: '0032',
        restTime: 150,
        sets: [
          { id: 's-arnold-pecho-espalda-5-0', weight: 100, reps: 8, completed: false },
          { id: 's-arnold-pecho-espalda-5-1', weight: 100, reps: 8, completed: false },
          { id: 's-arnold-pecho-espalda-5-2', weight: 100, reps: 8, completed: false }
        ]
      },
      {
        id: 'we-arnold-pecho-espalda-6',
        exerciseId: 'I3tsCnC',
        restTime: 60,
        sets: [
          { id: 's-arnold-pecho-espalda-6-0', weight: 0, reps: 15, completed: false },
          { id: 's-arnold-pecho-espalda-6-1', weight: 0, reps: 15, completed: false },
          { id: 's-arnold-pecho-espalda-6-2', weight: 0, reps: 15, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-arnold-hombros-brazos',
    name: 'Arnold: Hombros y Brazos',
    description: 'Hombros, bíceps y tríceps al estilo Arnold: press militar y push press para fuerza, más alto volumen de aislamiento para el pico de los brazos.',
    dayOfWeek: 'Martes y Viernes',
    folder: 'Arnold Schwarzenegger',
    exercises: [
      {
        id: 'we-arnold-hombros-brazos-0',
        exerciseId: '1457',
        restTime: 120,
        sets: [
          { id: 's-arnold-hombros-brazos-0-0', weight: 45, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-0-1', weight: 45, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-0-2', weight: 45, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-0-3', weight: 45, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-hombros-brazos-1',
        exerciseId: 'c9MnDRp',
        restTime: 60,
        sets: [
          { id: 's-arnold-hombros-brazos-1-0', weight: 10, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-1-1', weight: 10, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-1-2', weight: 10, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-1-3', weight: 10, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-hombros-brazos-2',
        exerciseId: '1700',
        restTime: 90,
        sets: [
          { id: 's-arnold-hombros-brazos-2-0', weight: 15, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-2-1', weight: 15, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-2-2', weight: 15, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-hombros-brazos-3',
        exerciseId: '25GPyDY',
        restTime: 75,
        sets: [
          { id: 's-arnold-hombros-brazos-3-0', weight: 30, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-3-1', weight: 30, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-3-2', weight: 30, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-3-3', weight: 30, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-hombros-brazos-4',
        exerciseId: 'NbVPDMW',
        restTime: 60,
        sets: [
          { id: 's-arnold-hombros-brazos-4-0', weight: 12, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-4-1', weight: 12, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-4-2', weight: 12, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-hombros-brazos-5',
        exerciseId: '0055',
        restTime: 90,
        sets: [
          { id: 's-arnold-hombros-brazos-5-0', weight: 60, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-5-1', weight: 60, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-5-2', weight: 60, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-5-3', weight: 60, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-hombros-brazos-6',
        exerciseId: 'h8LFzo9',
        restTime: 75,
        sets: [
          { id: 's-arnold-hombros-brazos-6-0', weight: 20, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-6-1', weight: 20, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-6-2', weight: 20, reps: 10, completed: false },
          { id: 's-arnold-hombros-brazos-6-3', weight: 20, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-hombros-brazos-7',
        exerciseId: 'iQ241UP',
        restTime: 45,
        sets: [
          { id: 's-arnold-hombros-brazos-7-0', weight: 0, reps: 20, completed: false },
          { id: 's-arnold-hombros-brazos-7-1', weight: 0, reps: 20, completed: false },
          { id: 's-arnold-hombros-brazos-7-2', weight: 0, reps: 20, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-arnold-piernas',
    name: 'Arnold: Piernas Completas',
    description: 'Día de pierna del "Blueprint to Mass": sentadillas y zancadas pesadas como eje, cerrando con isquiotibiales, gemelos y core.',
    dayOfWeek: 'Miércoles y Sábado',
    folder: 'Arnold Schwarzenegger',
    exercises: [
      {
        id: 'we-arnold-piernas-0',
        exerciseId: '1436',
        restTime: 150,
        sets: [
          { id: 's-arnold-piernas-0-0', weight: 90, reps: 10, completed: false },
          { id: 's-arnold-piernas-0-1', weight: 90, reps: 10, completed: false },
          { id: 's-arnold-piernas-0-2', weight: 90, reps: 10, completed: false },
          { id: 's-arnold-piernas-0-3', weight: 90, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-piernas-1',
        exerciseId: '62Nw60O',
        restTime: 90,
        sets: [
          { id: 's-arnold-piernas-1-0', weight: 20, reps: 10, completed: false },
          { id: 's-arnold-piernas-1-1', weight: 20, reps: 10, completed: false },
          { id: 's-arnold-piernas-1-2', weight: 20, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-piernas-2',
        exerciseId: '0586',
        restTime: 75,
        sets: [
          { id: 's-arnold-piernas-2-0', weight: 35, reps: 10, completed: false },
          { id: 's-arnold-piernas-2-1', weight: 35, reps: 10, completed: false },
          { id: 's-arnold-piernas-2-2', weight: 35, reps: 10, completed: false },
          { id: 's-arnold-piernas-2-3', weight: 35, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-piernas-3',
        exerciseId: '6HiHHe0',
        restTime: 60,
        sets: [
          { id: 's-arnold-piernas-3-0', weight: 60, reps: 12, completed: false },
          { id: 's-arnold-piernas-3-1', weight: 60, reps: 12, completed: false },
          { id: 's-arnold-piernas-3-2', weight: 60, reps: 12, completed: false },
          { id: 's-arnold-piernas-3-3', weight: 60, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-arnold-piernas-4',
        exerciseId: '0085',
        restTime: 90,
        sets: [
          { id: 's-arnold-piernas-4-0', weight: 80, reps: 10, completed: false },
          { id: 's-arnold-piernas-4-1', weight: 80, reps: 10, completed: false },
          { id: 's-arnold-piernas-4-2', weight: 80, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-piernas-5',
        exerciseId: '0044',
        restTime: 90,
        sets: [
          { id: 's-arnold-piernas-5-0', weight: 40, reps: 10, completed: false },
          { id: 's-arnold-piernas-5-1', weight: 40, reps: 10, completed: false },
          { id: 's-arnold-piernas-5-2', weight: 40, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-arnold-piernas-6',
        exerciseId: 'I3tsCnC',
        restTime: 60,
        sets: [
          { id: 's-arnold-piernas-6-0', weight: 0, reps: 15, completed: false },
          { id: 's-arnold-piernas-6-1', weight: 0, reps: 15, completed: false },
          { id: 's-arnold-piernas-6-2', weight: 0, reps: 15, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-ronnie-espalda-a',
    name: 'Ronnie Coleman: Espalda, Bíceps y Hombros (A)',
    description: 'Día de tirón al estilo "Yeah Buddy": peso muerto y remos muy pesados, cerrando con bíceps y press militar.',
    dayOfWeek: 'Lunes',
    folder: 'Ronnie Coleman',
    exercises: [
      {
        id: 'we-ronnie-espalda-a-0',
        exerciseId: '0032',
        restTime: 150,
        sets: [
          { id: 's-ronnie-espalda-a-0-0', weight: 140, reps: 8, completed: false },
          { id: 's-ronnie-espalda-a-0-1', weight: 140, reps: 8, completed: false },
          { id: 's-ronnie-espalda-a-0-2', weight: 140, reps: 8, completed: false },
          { id: 's-ronnie-espalda-a-0-3', weight: 140, reps: 8, completed: false }
        ]
      },
      {
        id: 'we-ronnie-espalda-a-1',
        exerciseId: 'eZyBC3j',
        restTime: 100,
        sets: [
          { id: 's-ronnie-espalda-a-1-0', weight: 90, reps: 10, completed: false },
          { id: 's-ronnie-espalda-a-1-1', weight: 90, reps: 10, completed: false },
          { id: 's-ronnie-espalda-a-1-2', weight: 90, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-ronnie-espalda-a-2',
        exerciseId: '1330',
        restTime: 90,
        sets: [
          { id: 's-ronnie-espalda-a-2-0', weight: 40, reps: 10, completed: false },
          { id: 's-ronnie-espalda-a-2-1', weight: 40, reps: 10, completed: false },
          { id: 's-ronnie-espalda-a-2-2', weight: 40, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-ronnie-espalda-a-3',
        exerciseId: '25GPyDY',
        restTime: 75,
        sets: [
          { id: 's-ronnie-espalda-a-3-0', weight: 35, reps: 12, completed: false },
          { id: 's-ronnie-espalda-a-3-1', weight: 35, reps: 12, completed: false },
          { id: 's-ronnie-espalda-a-3-2', weight: 35, reps: 12, completed: false },
          { id: 's-ronnie-espalda-a-3-3', weight: 35, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-espalda-a-4',
        exerciseId: '1457',
        restTime: 120,
        sets: [
          { id: 's-ronnie-espalda-a-4-0', weight: 65, reps: 10, completed: false },
          { id: 's-ronnie-espalda-a-4-1', weight: 65, reps: 10, completed: false },
          { id: 's-ronnie-espalda-a-4-2', weight: 65, reps: 10, completed: false },
          { id: 's-ronnie-espalda-a-4-3', weight: 65, reps: 10, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-ronnie-piernas-a',
    name: 'Ronnie Coleman: Piernas (A)',
    description: 'Sentadillas y prensa muy pesadas, el día de pierna más legendario del culturismo.',
    dayOfWeek: 'Martes',
    folder: 'Ronnie Coleman',
    exercises: [
      {
        id: 'we-ronnie-piernas-a-0',
        exerciseId: '1436',
        restTime: 180,
        sets: [
          { id: 's-ronnie-piernas-a-0-0', weight: 170, reps: 6, completed: false },
          { id: 's-ronnie-piernas-a-0-1', weight: 170, reps: 6, completed: false },
          { id: 's-ronnie-piernas-a-0-2', weight: 170, reps: 6, completed: false },
          { id: 's-ronnie-piernas-a-0-3', weight: 170, reps: 6, completed: false },
          { id: 's-ronnie-piernas-a-0-4', weight: 170, reps: 6, completed: false }
        ]
      },
      {
        id: 'we-ronnie-piernas-a-1',
        exerciseId: '10Z2DXU',
        restTime: 120,
        sets: [
          { id: 's-ronnie-piernas-a-1-0', weight: 200, reps: 12, completed: false },
          { id: 's-ronnie-piernas-a-1-1', weight: 200, reps: 12, completed: false },
          { id: 's-ronnie-piernas-a-1-2', weight: 200, reps: 12, completed: false },
          { id: 's-ronnie-piernas-a-1-3', weight: 200, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-piernas-a-2',
        exerciseId: 'IZVHb27',
        restTime: 60,
        sets: [
          { id: 's-ronnie-piernas-a-2-0', weight: 0, reps: 20, completed: false },
          { id: 's-ronnie-piernas-a-2-1', weight: 0, reps: 20, completed: false }
        ]
      },
      {
        id: 'we-ronnie-piernas-a-3',
        exerciseId: '0085',
        restTime: 100,
        sets: [
          { id: 's-ronnie-piernas-a-3-0', weight: 110, reps: 12, completed: false },
          { id: 's-ronnie-piernas-a-3-1', weight: 110, reps: 12, completed: false },
          { id: 's-ronnie-piernas-a-3-2', weight: 110, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-piernas-a-4',
        exerciseId: '0586',
        restTime: 75,
        sets: [
          { id: 's-ronnie-piernas-a-4-0', weight: 40, reps: 12, completed: false },
          { id: 's-ronnie-piernas-a-4-1', weight: 40, reps: 12, completed: false },
          { id: 's-ronnie-piernas-a-4-2', weight: 40, reps: 12, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-ronnie-pecho-a',
    name: 'Ronnie Coleman: Pecho y Tríceps (A)',
    description: 'Bench press como prioridad número uno, tal y como se ve en sus icónicos vídeos de entrenamiento.',
    dayOfWeek: 'Miércoles',
    folder: 'Ronnie Coleman',
    exercises: [
      {
        id: 'we-ronnie-pecho-a-0',
        exerciseId: '0025',
        restTime: 150,
        sets: [
          { id: 's-ronnie-pecho-a-0-0', weight: 150, reps: 12, completed: false },
          { id: 's-ronnie-pecho-a-0-1', weight: 150, reps: 12, completed: false },
          { id: 's-ronnie-pecho-a-0-2', weight: 150, reps: 12, completed: false },
          { id: 's-ronnie-pecho-a-0-3', weight: 150, reps: 12, completed: false },
          { id: 's-ronnie-pecho-a-0-4', weight: 150, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-pecho-a-1',
        exerciseId: '0047',
        restTime: 120,
        sets: [
          { id: 's-ronnie-pecho-a-1-0', weight: 95, reps: 12, completed: false },
          { id: 's-ronnie-pecho-a-1-1', weight: 95, reps: 12, completed: false },
          { id: 's-ronnie-pecho-a-1-2', weight: 95, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-pecho-a-2',
        exerciseId: 'P9ZRyLT',
        restTime: 75,
        sets: [
          { id: 's-ronnie-pecho-a-2-0', weight: 20, reps: 12, completed: false },
          { id: 's-ronnie-pecho-a-2-1', weight: 20, reps: 12, completed: false },
          { id: 's-ronnie-pecho-a-2-2', weight: 20, reps: 12, completed: false },
          { id: 's-ronnie-pecho-a-2-3', weight: 20, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-pecho-a-3',
        exerciseId: 'h8LFzo9',
        restTime: 90,
        sets: [
          { id: 's-ronnie-pecho-a-3-0', weight: 25, reps: 12, completed: false },
          { id: 's-ronnie-pecho-a-3-1', weight: 25, reps: 12, completed: false },
          { id: 's-ronnie-pecho-a-3-2', weight: 25, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-pecho-a-4',
        exerciseId: '0055',
        restTime: 90,
        sets: [
          { id: 's-ronnie-pecho-a-4-0', weight: 90, reps: 12, completed: false },
          { id: 's-ronnie-pecho-a-4-1', weight: 90, reps: 12, completed: false },
          { id: 's-ronnie-pecho-a-4-2', weight: 90, reps: 12, completed: false },
          { id: 's-ronnie-pecho-a-4-3', weight: 90, reps: 12, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-ronnie-espalda-b',
    name: 'Ronnie Coleman: Espalda, Bíceps y Hombros (B)',
    description: 'Segunda sesión semanal de espalda: remos y jalones con más volumen, más bíceps y hombros.',
    dayOfWeek: 'Jueves',
    folder: 'Ronnie Coleman',
    exercises: [
      {
        id: 'we-ronnie-espalda-b-0',
        exerciseId: 'eZyBC3j',
        restTime: 100,
        sets: [
          { id: 's-ronnie-espalda-b-0-0', weight: 95, reps: 12, completed: false },
          { id: 's-ronnie-espalda-b-0-1', weight: 95, reps: 12, completed: false },
          { id: 's-ronnie-espalda-b-0-2', weight: 95, reps: 12, completed: false },
          { id: 's-ronnie-espalda-b-0-3', weight: 95, reps: 12, completed: false },
          { id: 's-ronnie-espalda-b-0-4', weight: 95, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-espalda-b-1',
        exerciseId: '1323',
        restTime: 90,
        sets: [
          { id: 's-ronnie-espalda-b-1-0', weight: 55, reps: 12, completed: false },
          { id: 's-ronnie-espalda-b-1-1', weight: 55, reps: 12, completed: false },
          { id: 's-ronnie-espalda-b-1-2', weight: 55, reps: 12, completed: false },
          { id: 's-ronnie-espalda-b-1-3', weight: 55, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-espalda-b-2',
        exerciseId: 'SpsOSXk',
        restTime: 90,
        sets: [
          { id: 's-ronnie-espalda-b-2-0', weight: 60, reps: 12, completed: false },
          { id: 's-ronnie-espalda-b-2-1', weight: 60, reps: 12, completed: false },
          { id: 's-ronnie-espalda-b-2-2', weight: 60, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-espalda-b-3',
        exerciseId: 'ae9UoXQ',
        restTime: 60,
        sets: [
          { id: 's-ronnie-espalda-b-3-0', weight: 12, reps: 12, completed: false },
          { id: 's-ronnie-espalda-b-3-1', weight: 12, reps: 12, completed: false },
          { id: 's-ronnie-espalda-b-3-2', weight: 12, reps: 12, completed: false },
          { id: 's-ronnie-espalda-b-3-3', weight: 12, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-espalda-b-4',
        exerciseId: 'A6wtbuL',
        restTime: 90,
        sets: [
          { id: 's-ronnie-espalda-b-4-0', weight: 20, reps: 12, completed: false },
          { id: 's-ronnie-espalda-b-4-1', weight: 20, reps: 12, completed: false },
          { id: 's-ronnie-espalda-b-4-2', weight: 20, reps: 12, completed: false },
          { id: 's-ronnie-espalda-b-4-3', weight: 20, reps: 12, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-ronnie-piernas-b',
    name: 'Ronnie Coleman: Piernas (B)',
    description: 'Segunda sesión semanal de pierna: sentadilla frontal y hack squat con extensión y curl femoral.',
    dayOfWeek: 'Viernes',
    folder: 'Ronnie Coleman',
    exercises: [
      {
        id: 'we-ronnie-piernas-b-0',
        exerciseId: '0585',
        restTime: 75,
        sets: [
          { id: 's-ronnie-piernas-b-0-0', weight: 40, reps: 30, completed: false },
          { id: 's-ronnie-piernas-b-0-1', weight: 40, reps: 30, completed: false },
          { id: 's-ronnie-piernas-b-0-2', weight: 40, reps: 30, completed: false },
          { id: 's-ronnie-piernas-b-0-3', weight: 40, reps: 30, completed: false }
        ]
      },
      {
        id: 'we-ronnie-piernas-b-1',
        exerciseId: 'IeTIEqg',
        restTime: 90,
        sets: [
          { id: 's-ronnie-piernas-b-1-0', weight: 60, reps: 12, completed: false },
          { id: 's-ronnie-piernas-b-1-1', weight: 60, reps: 12, completed: false },
          { id: 's-ronnie-piernas-b-1-2', weight: 60, reps: 12, completed: false },
          { id: 's-ronnie-piernas-b-1-3', weight: 60, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-piernas-b-2',
        exerciseId: '0046',
        restTime: 90,
        sets: [
          { id: 's-ronnie-piernas-b-2-0', weight: 80, reps: 12, completed: false },
          { id: 's-ronnie-piernas-b-2-1', weight: 80, reps: 12, completed: false },
          { id: 's-ronnie-piernas-b-2-2', weight: 80, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-piernas-b-3',
        exerciseId: '0586',
        restTime: 75,
        sets: [
          { id: 's-ronnie-piernas-b-3-0', weight: 45, reps: 12, completed: false },
          { id: 's-ronnie-piernas-b-3-1', weight: 45, reps: 12, completed: false },
          { id: 's-ronnie-piernas-b-3-2', weight: 45, reps: 12, completed: false },
          { id: 's-ronnie-piernas-b-3-3', weight: 45, reps: 12, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-ronnie-pecho-b',
    name: 'Ronnie Coleman: Pecho, Tríceps y Gemelos (B)',
    description: 'Segunda sesión semanal de pecho con inclinado/declinado y cierre de gemelos, antes del descanso del domingo.',
    dayOfWeek: 'Sábado',
    folder: 'Ronnie Coleman',
    exercises: [
      {
        id: 'we-ronnie-pecho-b-0',
        exerciseId: '0314',
        restTime: 90,
        sets: [
          { id: 's-ronnie-pecho-b-0-0', weight: 26, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-0-1', weight: 26, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-0-2', weight: 26, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-0-3', weight: 26, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-pecho-b-1',
        exerciseId: '0033',
        restTime: 100,
        sets: [
          { id: 's-ronnie-pecho-b-1-0', weight: 100, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-1-1', weight: 100, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-1-2', weight: 100, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-pecho-b-2',
        exerciseId: '1PLE8e9',
        restTime: 75,
        sets: [
          { id: 's-ronnie-pecho-b-2-0', weight: 18, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-2-1', weight: 18, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-2-2', weight: 18, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-pecho-b-3',
        exerciseId: 'h8LFzo9',
        restTime: 90,
        sets: [
          { id: 's-ronnie-pecho-b-3-0', weight: 22, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-3-1', weight: 22, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-3-2', weight: 22, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-3-3', weight: 22, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-pecho-b-4',
        exerciseId: 'LmaFNZS',
        restTime: 60,
        sets: [
          { id: 's-ronnie-pecho-b-4-0', weight: 40, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-4-1', weight: 40, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-4-2', weight: 40, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-4-3', weight: 40, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-ronnie-pecho-b-5',
        exerciseId: '1371',
        restTime: 60,
        sets: [
          { id: 's-ronnie-pecho-b-5-0', weight: 40, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-5-1', weight: 40, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-5-2', weight: 40, reps: 12, completed: false },
          { id: 's-ronnie-pecho-b-5-3', weight: 40, reps: 12, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-dorian-hombros-triceps',
    name: 'Dorian Yates: Hombros, Trapecios y Tríceps',
    description: 'Día 1 del ciclo "Blood and Guts": 1-2 series de calentamiento y una única serie final al fallo absoluto por ejercicio.',
    dayOfWeek: 'Lunes',
    folder: 'Dorian Yates',
    exercises: [
      {
        id: 'we-dorian-hombros-triceps-0',
        exerciseId: '1457',
        restTime: 150,
        sets: [
          { id: 's-dorian-hombros-triceps-0-0', weight: 60, reps: 9, completed: false },
          { id: 's-dorian-hombros-triceps-0-1', weight: 60, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-dorian-hombros-triceps-1',
        exerciseId: 'c9MnDRp',
        restTime: 90,
        sets: [
          { id: 's-dorian-hombros-triceps-1-0', weight: 12, reps: 9, completed: false },
          { id: 's-dorian-hombros-triceps-1-1', weight: 12, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-dorian-hombros-triceps-2',
        exerciseId: '0095',
        restTime: 90,
        sets: [
          { id: 's-dorian-hombros-triceps-2-0', weight: 90, reps: 11, completed: false },
          { id: 's-dorian-hombros-triceps-2-1', weight: 90, reps: 11, completed: false }
        ]
      },
      {
        id: 'we-dorian-hombros-triceps-3',
        exerciseId: 'dU605di',
        restTime: 90,
        sets: [
          { id: 's-dorian-hombros-triceps-3-0', weight: 28, reps: 11, completed: false },
          { id: 's-dorian-hombros-triceps-3-1', weight: 28, reps: 11, completed: false }
        ]
      },
      {
        id: 'we-dorian-hombros-triceps-4',
        exerciseId: 'h8LFzo9',
        restTime: 90,
        sets: [
          { id: 's-dorian-hombros-triceps-4-0', weight: 25, reps: 9, completed: false },
          { id: 's-dorian-hombros-triceps-4-1', weight: 25, reps: 9, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-dorian-espalda',
    name: 'Dorian Yates: Espalda y Deltoides Posterior',
    description: 'Día 2 del ciclo: peso muerto y remos pesados llevados a la falla con series únicas de máxima intensidad.',
    dayOfWeek: 'Martes',
    folder: 'Dorian Yates',
    exercises: [
      {
        id: 'we-dorian-espalda-0',
        exerciseId: '9XjtHvS',
        restTime: 90,
        sets: [
          { id: 's-dorian-espalda-0-0', weight: 22, reps: 9, completed: false },
          { id: 's-dorian-espalda-0-1', weight: 22, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-dorian-espalda-1',
        exerciseId: 'SpsOSXk',
        restTime: 120,
        sets: [
          { id: 's-dorian-espalda-1-0', weight: 55, reps: 9, completed: false },
          { id: 's-dorian-espalda-1-1', weight: 55, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-dorian-espalda-2',
        exerciseId: 'eZyBC3j',
        restTime: 120,
        sets: [
          { id: 's-dorian-espalda-2-0', weight: 80, reps: 9, completed: false },
          { id: 's-dorian-espalda-2-1', weight: 80, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-dorian-espalda-3',
        exerciseId: '0489',
        restTime: 60,
        sets: [
          { id: 's-dorian-espalda-3-0', weight: 0, reps: 11, completed: false },
          { id: 's-dorian-espalda-3-1', weight: 0, reps: 11, completed: false }
        ]
      },
      {
        id: 'we-dorian-espalda-4',
        exerciseId: '0032',
        restTime: 180,
        sets: [
          { id: 's-dorian-espalda-4-0', weight: 130, reps: 8, completed: false },
          { id: 's-dorian-espalda-4-1', weight: 130, reps: 8, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-dorian-pecho-biceps',
    name: 'Dorian Yates: Pecho y Bíceps',
    description: 'Día 4 del ciclo: press inclinado como base, con aislamiento de pecho y bíceps al fallo.',
    dayOfWeek: 'Jueves',
    folder: 'Dorian Yates',
    exercises: [
      {
        id: 'we-dorian-pecho-biceps-0',
        exerciseId: '0047',
        restTime: 150,
        sets: [
          { id: 's-dorian-pecho-biceps-0-0', weight: 100, reps: 8, completed: false },
          { id: 's-dorian-pecho-biceps-0-1', weight: 100, reps: 8, completed: false }
        ]
      },
      {
        id: 'we-dorian-pecho-biceps-1',
        exerciseId: '0314',
        restTime: 100,
        sets: [
          { id: 's-dorian-pecho-biceps-1-0', weight: 28, reps: 7, completed: false },
          { id: 's-dorian-pecho-biceps-1-1', weight: 28, reps: 7, completed: false }
        ]
      },
      {
        id: 'we-dorian-pecho-biceps-2',
        exerciseId: 'P9ZRyLT',
        restTime: 90,
        sets: [
          { id: 's-dorian-pecho-biceps-2-0', weight: 18, reps: 8, completed: false },
          { id: 's-dorian-pecho-biceps-2-1', weight: 18, reps: 8, completed: false }
        ]
      },
      {
        id: 'we-dorian-pecho-biceps-3',
        exerciseId: 'Pr9Rhf4',
        restTime: 75,
        sets: [
          { id: 's-dorian-pecho-biceps-3-0', weight: 15, reps: 11, completed: false },
          { id: 's-dorian-pecho-biceps-3-1', weight: 15, reps: 11, completed: false }
        ]
      },
      {
        id: 'we-dorian-pecho-biceps-4',
        exerciseId: 'ae9UoXQ',
        restTime: 90,
        sets: [
          { id: 's-dorian-pecho-biceps-4-0', weight: 12, reps: 7, completed: false },
          { id: 's-dorian-pecho-biceps-4-1', weight: 12, reps: 7, completed: false }
        ]
      },
      {
        id: 'we-dorian-pecho-biceps-5',
        exerciseId: '6TG6x2w',
        restTime: 90,
        sets: [
          { id: 's-dorian-pecho-biceps-5-0', weight: 25, reps: 7, completed: false },
          { id: 's-dorian-pecho-biceps-5-1', weight: 25, reps: 7, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-dorian-piernas',
    name: 'Dorian Yates: Piernas',
    description: 'Día 6 del ciclo, el más temido: series pesadas al fallo en extensión, prensa, hack squat y curl femoral.',
    dayOfWeek: 'Sábado',
    folder: 'Dorian Yates',
    exercises: [
      {
        id: 'we-dorian-piernas-0',
        exerciseId: '0585',
        restTime: 90,
        sets: [
          { id: 's-dorian-piernas-0-0', weight: 45, reps: 11, completed: false },
          { id: 's-dorian-piernas-0-1', weight: 45, reps: 11, completed: false }
        ]
      },
      {
        id: 'we-dorian-piernas-1',
        exerciseId: '10Z2DXU',
        restTime: 150,
        sets: [
          { id: 's-dorian-piernas-1-0', weight: 180, reps: 11, completed: false },
          { id: 's-dorian-piernas-1-1', weight: 180, reps: 11, completed: false }
        ]
      },
      {
        id: 'we-dorian-piernas-2',
        exerciseId: '0046',
        restTime: 150,
        sets: [
          { id: 's-dorian-piernas-2-0', weight: 70, reps: 9, completed: false },
          { id: 's-dorian-piernas-2-1', weight: 70, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-dorian-piernas-3',
        exerciseId: '0586',
        restTime: 90,
        sets: [
          { id: 's-dorian-piernas-3-0', weight: 40, reps: 9, completed: false },
          { id: 's-dorian-piernas-3-1', weight: 40, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-dorian-piernas-4',
        exerciseId: '0085',
        restTime: 120,
        sets: [
          { id: 's-dorian-piernas-4-0', weight: 90, reps: 10, completed: false },
          { id: 's-dorian-piernas-4-1', weight: 90, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-dorian-piernas-5',
        exerciseId: '6HiHHe0',
        restTime: 75,
        sets: [
          { id: 's-dorian-piernas-5-0', weight: 70, reps: 11, completed: false },
          { id: 's-dorian-piernas-5-1', weight: 70, reps: 11, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-zane-espalda-biceps',
    name: 'Frank Zane: Espalda, Bíceps y Antebrazos',
    description: 'Día de tracción del "Growth Program": peso muerto y remo en T con series ascendentes de repeticiones, buscando simetría más que masa bruta.',
    dayOfWeek: 'Lunes y Jueves',
    folder: 'Frank Zane',
    exercises: [
      {
        id: 'we-zane-espalda-biceps-0',
        exerciseId: '0032',
        restTime: 90,
        sets: [
          { id: 's-zane-espalda-biceps-0-0', weight: 70, reps: 12, completed: false },
          { id: 's-zane-espalda-biceps-0-1', weight: 70, reps: 12, completed: false },
          { id: 's-zane-espalda-biceps-0-2', weight: 70, reps: 12, completed: false },
          { id: 's-zane-espalda-biceps-0-3', weight: 70, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-zane-espalda-biceps-1',
        exerciseId: '0248',
        restTime: 90,
        sets: [
          { id: 's-zane-espalda-biceps-1-0', weight: 50, reps: 10, completed: false },
          { id: 's-zane-espalda-biceps-1-1', weight: 50, reps: 10, completed: false },
          { id: 's-zane-espalda-biceps-1-2', weight: 50, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-zane-espalda-biceps-2',
        exerciseId: 'SpsOSXk',
        restTime: 75,
        sets: [
          { id: 's-zane-espalda-biceps-2-0', weight: 45, reps: 9, completed: false },
          { id: 's-zane-espalda-biceps-2-1', weight: 45, reps: 9, completed: false },
          { id: 's-zane-espalda-biceps-2-2', weight: 45, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-zane-espalda-biceps-3',
        exerciseId: 'C0MA9bC',
        restTime: 75,
        sets: [
          { id: 's-zane-espalda-biceps-3-0', weight: 22, reps: 9, completed: false },
          { id: 's-zane-espalda-biceps-3-1', weight: 22, reps: 9, completed: false },
          { id: 's-zane-espalda-biceps-3-2', weight: 22, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-zane-espalda-biceps-4',
        exerciseId: 'TiaZTxx',
        restTime: 60,
        sets: [
          { id: 's-zane-espalda-biceps-4-0', weight: 10, reps: 9, completed: false },
          { id: 's-zane-espalda-biceps-4-1', weight: 10, reps: 9, completed: false },
          { id: 's-zane-espalda-biceps-4-2', weight: 10, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-zane-espalda-biceps-5',
        exerciseId: '0126',
        restTime: 45,
        sets: [
          { id: 's-zane-espalda-biceps-5-0', weight: 15, reps: 15, completed: false },
          { id: 's-zane-espalda-biceps-5-1', weight: 15, reps: 15, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-zane-piernas-abdomen',
    name: 'Frank Zane: Piernas, Gemelos y Abdomen',
    description: 'Sentadillas con series ascendentes de repeticiones y negativas lentas, seguidas de un intenso trabajo de abdomen.',
    dayOfWeek: 'Martes y Viernes',
    folder: 'Frank Zane',
    exercises: [
      {
        id: 'we-zane-piernas-abdomen-0',
        exerciseId: '1436',
        restTime: 90,
        sets: [
          { id: 's-zane-piernas-abdomen-0-0', weight: 60, reps: 12, completed: false },
          { id: 's-zane-piernas-abdomen-0-1', weight: 60, reps: 12, completed: false },
          { id: 's-zane-piernas-abdomen-0-2', weight: 60, reps: 12, completed: false },
          { id: 's-zane-piernas-abdomen-0-3', weight: 60, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-zane-piernas-abdomen-1',
        exerciseId: '0585',
        restTime: 75,
        sets: [
          { id: 's-zane-piernas-abdomen-1-0', weight: 30, reps: 10, completed: false },
          { id: 's-zane-piernas-abdomen-1-1', weight: 30, reps: 10, completed: false },
          { id: 's-zane-piernas-abdomen-1-2', weight: 30, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-zane-piernas-abdomen-2',
        exerciseId: '6HiHHe0',
        restTime: 45,
        sets: [
          { id: 's-zane-piernas-abdomen-2-0', weight: 20, reps: 18, completed: false },
          { id: 's-zane-piernas-abdomen-2-1', weight: 20, reps: 18, completed: false },
          { id: 's-zane-piernas-abdomen-2-2', weight: 20, reps: 18, completed: false }
        ]
      },
      {
        id: 'we-zane-piernas-abdomen-3',
        exerciseId: 'C9LuR4A',
        restTime: 45,
        sets: [
          { id: 's-zane-piernas-abdomen-3-0', weight: 30, reps: 22, completed: false },
          { id: 's-zane-piernas-abdomen-3-1', weight: 30, reps: 22, completed: false },
          { id: 's-zane-piernas-abdomen-3-2', weight: 30, reps: 22, completed: false }
        ]
      },
      {
        id: 'we-zane-piernas-abdomen-4',
        exerciseId: 'I3tsCnC',
        restTime: 60,
        sets: [
          { id: 's-zane-piernas-abdomen-4-0', weight: 0, reps: 25, completed: false },
          { id: 's-zane-piernas-abdomen-4-1', weight: 0, reps: 25, completed: false },
          { id: 's-zane-piernas-abdomen-4-2', weight: 0, reps: 25, completed: false }
        ]
      },
      {
        id: 'we-zane-piernas-abdomen-5',
        exerciseId: 'iQ241UP',
        restTime: 45,
        sets: [
          { id: 's-zane-piernas-abdomen-5-0', weight: 0, reps: 25, completed: false },
          { id: 's-zane-piernas-abdomen-5-1', weight: 0, reps: 25, completed: false },
          { id: 's-zane-piernas-abdomen-5-2', weight: 0, reps: 25, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-zane-pecho-hombros',
    name: 'Frank Zane: Pecho, Hombros, Tríceps y Abdomen',
    description: 'Press de banca con series ascendentes de peso y descendentes de repeticiones (12-10-8-6-4-2), más el trabajo de deltoides característico de su simetría.',
    dayOfWeek: 'Miércoles y Sábado',
    folder: 'Frank Zane',
    exercises: [
      {
        id: 'we-zane-pecho-hombros-0',
        exerciseId: '0025',
        restTime: 90,
        sets: [
          { id: 's-zane-pecho-hombros-0-0', weight: 60, reps: 10, completed: false },
          { id: 's-zane-pecho-hombros-0-1', weight: 60, reps: 10, completed: false },
          { id: 's-zane-pecho-hombros-0-2', weight: 60, reps: 10, completed: false },
          { id: 's-zane-pecho-hombros-0-3', weight: 60, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-zane-pecho-hombros-1',
        exerciseId: '0314',
        restTime: 75,
        sets: [
          { id: 's-zane-pecho-hombros-1-0', weight: 22, reps: 10, completed: false },
          { id: 's-zane-pecho-hombros-1-1', weight: 22, reps: 10, completed: false },
          { id: 's-zane-pecho-hombros-1-2', weight: 22, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-zane-pecho-hombros-2',
        exerciseId: '1qrWgZ2',
        restTime: 60,
        sets: [
          { id: 's-zane-pecho-hombros-2-0', weight: 16, reps: 10, completed: false },
          { id: 's-zane-pecho-hombros-2-1', weight: 16, reps: 10, completed: false },
          { id: 's-zane-pecho-hombros-2-2', weight: 16, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-zane-pecho-hombros-3',
        exerciseId: '9XjtHvS',
        restTime: 60,
        sets: [
          { id: 's-zane-pecho-hombros-3-0', weight: 18, reps: 10, completed: false },
          { id: 's-zane-pecho-hombros-3-1', weight: 18, reps: 10, completed: false },
          { id: 's-zane-pecho-hombros-3-2', weight: 18, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-zane-pecho-hombros-4',
        exerciseId: '0055',
        restTime: 75,
        sets: [
          { id: 's-zane-pecho-hombros-4-0', weight: 55, reps: 10, completed: false },
          { id: 's-zane-pecho-hombros-4-1', weight: 55, reps: 10, completed: false },
          { id: 's-zane-pecho-hombros-4-2', weight: 55, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-zane-pecho-hombros-5',
        exerciseId: 'dU605di',
        restTime: 60,
        sets: [
          { id: 's-zane-pecho-hombros-5-0', weight: 22, reps: 10, completed: false },
          { id: 's-zane-pecho-hombros-5-1', weight: 22, reps: 10, completed: false },
          { id: 's-zane-pecho-hombros-5-2', weight: 22, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-zane-pecho-hombros-6',
        exerciseId: '0345',
        restTime: 60,
        sets: [
          { id: 's-zane-pecho-hombros-6-0', weight: 8, reps: 12, completed: false },
          { id: 's-zane-pecho-hombros-6-1', weight: 8, reps: 12, completed: false },
          { id: 's-zane-pecho-hombros-6-2', weight: 8, reps: 12, completed: false }
        ]
      },
      {
        id: 'we-zane-pecho-hombros-7',
        exerciseId: 'aqvSOQE',
        restTime: 60,
        sets: [
          { id: 's-zane-pecho-hombros-7-0', weight: 12, reps: 10, completed: false },
          { id: 's-zane-pecho-hombros-7-1', weight: 12, reps: 10, completed: false },
          { id: 's-zane-pecho-hombros-7-2', weight: 12, reps: 10, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-cbum-piernas-cuadriceps',
    name: 'CBum: Piernas — Cuádriceps y Gemelos',
    description: 'Día 1 del ciclo de 8 días de Chris Bumstead: máquinas y drop sets para cuádriceps, cerrando con gemelos.',
    dayOfWeek: 'Día 1 del ciclo',
    folder: 'Chris Bumstead',
    exercises: [
      {
        id: 'we-cbum-piernas-cuadriceps-0',
        exerciseId: '0585',
        restTime: 75,
        sets: [
          { id: 's-cbum-piernas-cuadriceps-0-0', weight: 45, reps: 20, completed: false },
          { id: 's-cbum-piernas-cuadriceps-0-1', weight: 45, reps: 20, completed: false }
        ]
      },
      {
        id: 'we-cbum-piernas-cuadriceps-1',
        exerciseId: '0770',
        restTime: 120,
        sets: [
          { id: 's-cbum-piernas-cuadriceps-1-0', weight: 100, reps: 8, completed: false },
          { id: 's-cbum-piernas-cuadriceps-1-1', weight: 100, reps: 8, completed: false }
        ]
      },
      {
        id: 'we-cbum-piernas-cuadriceps-2',
        exerciseId: '1425',
        restTime: 90,
        sets: [
          { id: 's-cbum-piernas-cuadriceps-2-0', weight: 80, reps: 9, completed: false },
          { id: 's-cbum-piernas-cuadriceps-2-1', weight: 80, reps: 9, completed: false },
          { id: 's-cbum-piernas-cuadriceps-2-2', weight: 80, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-cbum-piernas-cuadriceps-3',
        exerciseId: '1371',
        restTime: 60,
        sets: [
          { id: 's-cbum-piernas-cuadriceps-3-0', weight: 40, reps: 11, completed: false },
          { id: 's-cbum-piernas-cuadriceps-3-1', weight: 40, reps: 11, completed: false },
          { id: 's-cbum-piernas-cuadriceps-3-2', weight: 40, reps: 11, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-cbum-pecho-triceps',
    name: 'CBum: Pecho y Tríceps',
    description: 'Día 2 del ciclo: pecho superior con mancuernas y máquinas, más tríceps con estilo moderno de drop sets.',
    dayOfWeek: 'Día 2 del ciclo',
    folder: 'Chris Bumstead',
    exercises: [
      {
        id: 'we-cbum-pecho-triceps-0',
        exerciseId: '0314',
        restTime: 90,
        sets: [
          { id: 's-cbum-pecho-triceps-0-0', weight: 30, reps: 9, completed: false },
          { id: 's-cbum-pecho-triceps-0-1', weight: 30, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-cbum-pecho-triceps-1',
        exerciseId: '1278',
        restTime: 75,
        sets: [
          { id: 's-cbum-pecho-triceps-1-0', weight: 12, reps: 9, completed: false },
          { id: 's-cbum-pecho-triceps-1-1', weight: 12, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-cbum-pecho-triceps-2',
        exerciseId: 'Pr9Rhf4',
        restTime: 60,
        sets: [
          { id: 's-cbum-pecho-triceps-2-0', weight: 15, reps: 15, completed: false },
          { id: 's-cbum-pecho-triceps-2-1', weight: 15, reps: 15, completed: false },
          { id: 's-cbum-pecho-triceps-2-2', weight: 15, reps: 15, completed: false }
        ]
      },
      {
        id: 'we-cbum-pecho-triceps-3',
        exerciseId: 'h8LFzo9',
        restTime: 75,
        sets: [
          { id: 's-cbum-pecho-triceps-3-0', weight: 20, reps: 9, completed: false },
          { id: 's-cbum-pecho-triceps-3-1', weight: 20, reps: 9, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-cbum-espalda-biceps',
    name: 'CBum: Espalda y Bíceps',
    description: 'Día 3 del ciclo, enfocado en grosor de espalda: jalones, remos y curl predicador en máquina.',
    dayOfWeek: 'Día 3 del ciclo',
    folder: 'Chris Bumstead',
    exercises: [
      {
        id: 'we-cbum-espalda-biceps-0',
        exerciseId: 'SpsOSXk',
        restTime: 90,
        sets: [
          { id: 's-cbum-espalda-biceps-0-0', weight: 55, reps: 11, completed: false },
          { id: 's-cbum-espalda-biceps-0-1', weight: 55, reps: 11, completed: false },
          { id: 's-cbum-espalda-biceps-0-2', weight: 55, reps: 11, completed: false }
        ]
      },
      {
        id: 'we-cbum-espalda-biceps-1',
        exerciseId: '0327',
        restTime: 90,
        sets: [
          { id: 's-cbum-espalda-biceps-1-0', weight: 24, reps: 9, completed: false },
          { id: 's-cbum-espalda-biceps-1-1', weight: 24, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-cbum-espalda-biceps-2',
        exerciseId: '0248',
        restTime: 90,
        sets: [
          { id: 's-cbum-espalda-biceps-2-0', weight: 45, reps: 9, completed: false },
          { id: 's-cbum-espalda-biceps-2-1', weight: 45, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-cbum-espalda-biceps-3',
        exerciseId: '0592',
        restTime: 60,
        sets: [
          { id: 's-cbum-espalda-biceps-3-0', weight: 20, reps: 11, completed: false },
          { id: 's-cbum-espalda-biceps-3-1', weight: 20, reps: 11, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-cbum-hombros-pecho',
    name: 'CBum: Hombros y Pecho',
    description: 'Día 5 del ciclo, tras el descanso: press de hombro, laterales y trabajo de deltoides posterior.',
    dayOfWeek: 'Día 5 del ciclo',
    folder: 'Chris Bumstead',
    exercises: [
      {
        id: 'we-cbum-hombros-pecho-0',
        exerciseId: 'A6wtbuL',
        restTime: 90,
        sets: [
          { id: 's-cbum-hombros-pecho-0-0', weight: 22, reps: 8, completed: false },
          { id: 's-cbum-hombros-pecho-0-1', weight: 22, reps: 8, completed: false }
        ]
      },
      {
        id: 'we-cbum-hombros-pecho-1',
        exerciseId: 'c9MnDRp',
        restTime: 60,
        sets: [
          { id: 's-cbum-hombros-pecho-1-0', weight: 10, reps: 9, completed: false },
          { id: 's-cbum-hombros-pecho-1-1', weight: 10, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-cbum-hombros-pecho-2',
        exerciseId: '0225',
        restTime: 60,
        sets: [
          { id: 's-cbum-hombros-pecho-2-0', weight: 12, reps: 11, completed: false },
          { id: 's-cbum-hombros-pecho-2-1', weight: 12, reps: 11, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-cbum-isquios-espalda',
    name: 'CBum: Isquiotibiales y Espalda',
    description: 'Segundo día de pierna del ciclo centrado en isquiotibiales, con peso muerto y trabajo de espalda añadido.',
    dayOfWeek: 'Día 6 del ciclo',
    folder: 'Chris Bumstead',
    exercises: [
      {
        id: 'we-cbum-isquios-espalda-0',
        exerciseId: '0586',
        restTime: 90,
        sets: [
          { id: 's-cbum-isquios-espalda-0-0', weight: 35, reps: 9, completed: false },
          { id: 's-cbum-isquios-espalda-0-1', weight: 35, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-cbum-isquios-espalda-1',
        exerciseId: '0032',
        restTime: 150,
        sets: [
          { id: 's-cbum-isquios-espalda-1-0', weight: 110, reps: 6, completed: false },
          { id: 's-cbum-isquios-espalda-1-1', weight: 110, reps: 6, completed: false }
        ]
      },
      {
        id: 'we-cbum-isquios-espalda-2',
        exerciseId: 'x69MAlq',
        restTime: 90,
        sets: [
          { id: 's-cbum-isquios-espalda-2-0', weight: 40, reps: 9, completed: false },
          { id: 's-cbum-isquios-espalda-2-1', weight: 40, reps: 9, completed: false },
          { id: 's-cbum-isquios-espalda-2-2', weight: 40, reps: 9, completed: false }
        ]
      }
    ]
  },
  {
    id: 'routine-cbum-brazos',
    name: 'CBum: Brazos',
    description: 'Último día de entrenamiento del ciclo antes del descanso: tríceps y bíceps con drop sets al estilo Classic Physique moderno.',
    dayOfWeek: 'Día 7 del ciclo',
    folder: 'Chris Bumstead',
    exercises: [
      {
        id: 'we-cbum-brazos-0',
        exerciseId: 'dU605di',
        restTime: 60,
        sets: [
          { id: 's-cbum-brazos-0-0', weight: 25, reps: 9, completed: false },
          { id: 's-cbum-brazos-0-1', weight: 25, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-cbum-brazos-1',
        exerciseId: 'h8LFzo9',
        restTime: 75,
        sets: [
          { id: 's-cbum-brazos-1-0', weight: 18, reps: 9, completed: false },
          { id: 's-cbum-brazos-1-1', weight: 18, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-cbum-brazos-2',
        exerciseId: 'SYJ4Bkt',
        restTime: 75,
        sets: [
          { id: 's-cbum-brazos-2-0', weight: 22, reps: 9, completed: false },
          { id: 's-cbum-brazos-2-1', weight: 22, reps: 9, completed: false },
          { id: 's-cbum-brazos-2-2', weight: 22, reps: 9, completed: false }
        ]
      },
      {
        id: 'we-cbum-brazos-3',
        exerciseId: 'NbVPDMW',
        restTime: 60,
        sets: [
          { id: 's-cbum-brazos-3-0', weight: 12, reps: 11, completed: false },
          { id: 's-cbum-brazos-3-1', weight: 12, reps: 11, completed: false }
        ]
      }
    ]
  }
];

// Generamos logs de entrenamiento históricos realistas
// Vamos a crear entrenamientos de Empuje, Tirón y Piernas durante las últimas 4 semanas
export const DEFAULT_LOGS: WorkoutLog[] = [
  // --- SEMANA 1 (Hace 28-24 días) ---
  {
    id: 'log-w1-push',
    routineId: 'routine-push',
    routineName: 'Rutina Empuje A (Pecho/Hombro/Tríceps)',
    date: getDateDaysAgo(26), // 26 días atrás (Lunes)
    duration: 3420, // 57 min
    exercises: [
      {
        id: uuid(),
        exerciseId: '0025',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 60, reps: 8, completed: true },
          { id: uuid(), weight: 60, reps: 8, completed: true },
          { id: uuid(), weight: 60, reps: 8, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '1457',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 38, reps: 8, completed: true },
          { id: uuid(), weight: 38, reps: 8, completed: true },
          { id: uuid(), weight: 38, reps: 7, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '0314',
        restTime: 90,
        sets: [
          { id: uuid(), weight: 20, reps: 10, completed: true },
          { id: uuid(), weight: 20, reps: 10, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: 'dU605di',
        restTime: 75,
        sets: [
          { id: uuid(), weight: 18, reps: 12, completed: true },
          { id: uuid(), weight: 18, reps: 12, completed: true },
          { id: uuid(), weight: 18, reps: 12, completed: true }
        ]
      }
    ]
  },
  {
    id: 'log-w1-pull',
    routineId: 'routine-pull',
    routineName: 'Rutina Tirón A (Espalda/Bíceps/Core)',
    date: getDateDaysAgo(24), // Miércoles
    duration: 3600, // 60 min
    exercises: [
      {
        id: uuid(),
        exerciseId: '0032',
        restTime: 150,
        sets: [
          { id: uuid(), weight: 100, reps: 5, completed: true },
          { id: uuid(), weight: 100, reps: 5, completed: true },
          { id: uuid(), weight: 100, reps: 5, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '0651',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 0, reps: 8, completed: true },
          { id: uuid(), weight: 0, reps: 7, completed: true },
          { id: uuid(), weight: 0, reps: 6, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: 'eZyBC3j',
        restTime: 90,
        sets: [
          { id: uuid(), weight: 55, reps: 10, completed: true },
          { id: uuid(), weight: 55, reps: 10, completed: true },
          { id: uuid(), weight: 55, reps: 10, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '25GPyDY',
        restTime: 75,
        sets: [
          { id: uuid(), weight: 26, reps: 12, completed: true },
          { id: uuid(), weight: 26, reps: 12, completed: true },
          { id: uuid(), weight: 26, reps: 10, completed: true }
        ]
      }
    ]
  },
  {
    id: 'log-w1-legs',
    routineId: 'routine-legs',
    routineName: 'Rutina Pierna Completa',
    date: getDateDaysAgo(22), // Viernes
    duration: 3100,
    exercises: [
      {
        id: uuid(),
        exerciseId: '1436',
        restTime: 150,
        sets: [
          { id: uuid(), weight: 80, reps: 8, completed: true },
          { id: uuid(), weight: 80, reps: 8, completed: true },
          { id: uuid(), weight: 80, reps: 8, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '0085',
        restTime: 90,
        sets: [
          { id: uuid(), weight: 70, reps: 10, completed: true },
          { id: uuid(), weight: 70, reps: 10, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '10Z2DXU',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 140, reps: 12, completed: true },
          { id: uuid(), weight: 140, reps: 12, completed: true },
          { id: uuid(), weight: 140, reps: 12, completed: true }
        ]
      }
    ]
  },

  // --- SEMANA 2 (Hace 21-17 días) ---
  {
    id: 'log-w2-push',
    routineId: 'routine-push',
    routineName: 'Rutina Empuje A (Pecho/Hombro/Tríceps)',
    date: getDateDaysAgo(19),
    duration: 3500,
    exercises: [
      {
        id: uuid(),
        exerciseId: '0025',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 64, reps: 8, completed: true },
          { id: uuid(), weight: 64, reps: 8, completed: true },
          { id: uuid(), weight: 64, reps: 7, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '1457',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 40, reps: 8, completed: true },
          { id: uuid(), weight: 40, reps: 8, completed: true },
          { id: uuid(), weight: 40, reps: 7, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '0314',
        restTime: 90,
        sets: [
          { id: uuid(), weight: 22, reps: 10, completed: true },
          { id: uuid(), weight: 22, reps: 10, completed: true },
          { id: uuid(), weight: 22, reps: 8, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: 'dU605di',
        restTime: 75,
        sets: [
          { id: uuid(), weight: 20, reps: 12, completed: true },
          { id: uuid(), weight: 20, reps: 12, completed: true },
          { id: uuid(), weight: 20, reps: 11, completed: true }
        ]
      }
    ]
  },
  {
    id: 'log-w2-pull',
    routineId: 'routine-pull',
    routineName: 'Rutina Tirón A (Espalda/Bíceps/Core)',
    date: getDateDaysAgo(17),
    duration: 3800,
    exercises: [
      {
        id: uuid(),
        exerciseId: '0032',
        restTime: 150,
        sets: [
          { id: uuid(), weight: 105, reps: 5, completed: true },
          { id: uuid(), weight: 105, reps: 5, completed: true },
          { id: uuid(), weight: 105, reps: 5, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '0651',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 0, reps: 9, completed: true },
          { id: uuid(), weight: 0, reps: 8, completed: true },
          { id: uuid(), weight: 0, reps: 7, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: 'eZyBC3j',
        restTime: 90,
        sets: [
          { id: uuid(), weight: 58, reps: 10, completed: true },
          { id: uuid(), weight: 58, reps: 10, completed: true },
          { id: uuid(), weight: 58, reps: 9, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '25GPyDY',
        restTime: 75,
        sets: [
          { id: uuid(), weight: 28, reps: 12, completed: true },
          { id: uuid(), weight: 28, reps: 11, completed: true },
          { id: uuid(), weight: 28, reps: 10, completed: true }
        ]
      }
    ]
  },
  {
    id: 'log-w2-legs',
    routineId: 'routine-legs',
    routineName: 'Rutina Pierna Completa',
    date: getDateDaysAgo(15),
    duration: 3300,
    exercises: [
      {
        id: uuid(),
        exerciseId: '1436',
        restTime: 150,
        sets: [
          { id: uuid(), weight: 84, reps: 8, completed: true },
          { id: uuid(), weight: 84, reps: 8, completed: true },
          { id: uuid(), weight: 84, reps: 8, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '0085',
        restTime: 90,
        sets: [
          { id: uuid(), weight: 74, reps: 10, completed: true },
          { id: uuid(), weight: 74, reps: 10, completed: true },
          { id: uuid(), weight: 74, reps: 8, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '10Z2DXU',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 150, reps: 12, completed: true },
          { id: uuid(), weight: 150, reps: 12, completed: true },
          { id: uuid(), weight: 160, reps: 10, completed: true }
        ]
      }
    ]
  },

  // --- SEMANA 3 (Hace 14-10 días) ---
  {
    id: 'log-w3-push',
    routineId: 'routine-push',
    routineName: 'Rutina Empuje A (Pecho/Hombro/Tríceps)',
    date: getDateDaysAgo(12),
    duration: 3600,
    exercises: [
      {
        id: uuid(),
        exerciseId: '0025',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 68, reps: 8, completed: true },
          { id: uuid(), weight: 68, reps: 8, completed: true },
          { id: uuid(), weight: 68, reps: 8, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '1457',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 42, reps: 8, completed: true },
          { id: uuid(), weight: 42, reps: 8, completed: true },
          { id: uuid(), weight: 42, reps: 7, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '0314',
        restTime: 90,
        sets: [
          { id: uuid(), weight: 24, reps: 10, completed: true },
          { id: uuid(), weight: 24, reps: 9, completed: true },
          { id: uuid(), weight: 24, reps: 8, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: 'dU605di',
        restTime: 75,
        sets: [
          { id: uuid(), weight: 22, reps: 12, completed: true },
          { id: uuid(), weight: 22, reps: 12, completed: true },
          { id: uuid(), weight: 22, reps: 11, completed: true }
        ]
      }
    ]
  },
  {
    id: 'log-w3-pull',
    routineId: 'routine-pull',
    routineName: 'Rutina Tirón A (Espalda/Bíceps/Core)',
    date: getDateDaysAgo(10),
    duration: 3750,
    exercises: [
      {
        id: uuid(),
        exerciseId: '0032',
        restTime: 150,
        sets: [
          { id: uuid(), weight: 110, reps: 5, completed: true },
          { id: uuid(), weight: 110, reps: 5, completed: true },
          { id: uuid(), weight: 110, reps: 5, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '0651',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 0, reps: 10, completed: true },
          { id: uuid(), weight: 0, reps: 8, completed: true },
          { id: uuid(), weight: 0, reps: 8, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: 'eZyBC3j',
        restTime: 90,
        sets: [
          { id: uuid(), weight: 60, reps: 10, completed: true },
          { id: uuid(), weight: 60, reps: 10, completed: true },
          { id: uuid(), weight: 60, reps: 10, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '25GPyDY',
        restTime: 75,
        sets: [
          { id: uuid(), weight: 30, reps: 12, completed: true },
          { id: uuid(), weight: 30, reps: 10, completed: true },
          { id: uuid(), weight: 30, reps: 10, completed: true }
        ]
      }
    ]
  },
  {
    id: 'log-w3-legs',
    routineId: 'routine-legs',
    routineName: 'Rutina Pierna Completa',
    date: getDateDaysAgo(8),
    duration: 3400,
    exercises: [
      {
        id: uuid(),
        exerciseId: '1436',
        restTime: 150,
        sets: [
          { id: uuid(), weight: 88, reps: 8, completed: true },
          { id: uuid(), weight: 88, reps: 8, completed: true },
          { id: uuid(), weight: 88, reps: 8, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '0085',
        restTime: 90,
        sets: [
          { id: uuid(), weight: 76, reps: 10, completed: true },
          { id: uuid(), weight: 76, reps: 10, completed: true },
          { id: uuid(), weight: 76, reps: 8, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '10Z2DXU',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 160, reps: 12, completed: true },
          { id: uuid(), weight: 160, reps: 12, completed: true },
          { id: uuid(), weight: 170, reps: 10, completed: true }
        ]
      }
    ]
  },

  // --- SEMANA 4 (Hace 7-2 días) ---
  {
    id: 'log-w4-push',
    routineId: 'routine-push',
    routineName: 'Rutina Empuje A (Pecho/Hombro/Tríceps)',
    date: getDateDaysAgo(5),
    duration: 3820,
    exercises: [
      {
        id: uuid(),
        exerciseId: '0025',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 70, reps: 8, completed: true },
          { id: uuid(), weight: 70, reps: 8, completed: true },
          { id: uuid(), weight: 70, reps: 7, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '1457',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 45, reps: 8, completed: true },
          { id: uuid(), weight: 45, reps: 8, completed: true },
          { id: uuid(), weight: 45, reps: 6, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '0314',
        restTime: 90,
        sets: [
          { id: uuid(), weight: 24, reps: 10, completed: true },
          { id: uuid(), weight: 24, reps: 10, completed: true },
          { id: uuid(), weight: 24, reps: 8, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: 'dU605di',
        restTime: 75,
        sets: [
          { id: uuid(), weight: 22, reps: 12, completed: true },
          { id: uuid(), weight: 22, reps: 12, completed: true },
          { id: uuid(), weight: 22, reps: 10, completed: true }
        ]
      }
    ]
  },
  {
    id: 'log-w4-pull',
    routineId: 'routine-pull',
    routineName: 'Rutina Tirón A (Espalda/Bíceps/Core)',
    date: getDateDaysAgo(3),
    duration: 3660,
    exercises: [
      {
        id: uuid(),
        exerciseId: '0032',
        restTime: 150,
        sets: [
          { id: uuid(), weight: 110, reps: 5, completed: true },
          { id: uuid(), weight: 110, reps: 5, completed: true },
          { id: uuid(), weight: 115, reps: 5, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '0651',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 0, reps: 10, completed: true },
          { id: uuid(), weight: 0, reps: 8, completed: true },
          { id: uuid(), weight: 0, reps: 8, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: 'eZyBC3j',
        restTime: 90,
        sets: [
          { id: uuid(), weight: 65, reps: 10, completed: true },
          { id: uuid(), weight: 65, reps: 10, completed: true },
          { id: uuid(), weight: 65, reps: 8, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '25GPyDY',
        restTime: 75,
        sets: [
          { id: uuid(), weight: 30, reps: 12, completed: true },
          { id: uuid(), weight: 30, reps: 10, completed: true },
          { id: uuid(), weight: 30, reps: 10, completed: true }
        ]
      }
    ]
  },
  {
    id: 'log-w4-legs',
    routineId: 'routine-legs',
    routineName: 'Rutina Pierna Completa',
    date: getDateDaysAgo(1), // Ayer! (Viernes)
    duration: 3500,
    exercises: [
      {
        id: uuid(),
        exerciseId: '1436',
        restTime: 150,
        sets: [
          { id: uuid(), weight: 90, reps: 8, completed: true },
          { id: uuid(), weight: 90, reps: 8, completed: true },
          { id: uuid(), weight: 90, reps: 8, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '0085',
        restTime: 90,
        sets: [
          { id: uuid(), weight: 80, reps: 10, completed: true },
          { id: uuid(), weight: 80, reps: 10, completed: true },
          { id: uuid(), weight: 80, reps: 8, completed: true }
        ]
      },
      {
        id: uuid(),
        exerciseId: '10Z2DXU',
        restTime: 120,
        sets: [
          { id: uuid(), weight: 160, reps: 12, completed: true },
          { id: uuid(), weight: 180, reps: 10, completed: true },
          { id: uuid(), weight: 180, reps: 10, completed: true }
        ]
      }
    ]
  }
];
