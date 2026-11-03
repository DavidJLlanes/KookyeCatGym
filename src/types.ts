import type { MuscleGroup, Equipment, ExerciseCategory } from './data/exerciseMeta';

export interface Exercise {
  id: string;
  name: string;
  // Las listas de valores viven en data/exerciseMeta.ts (única fuente de verdad).
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  // Imagen estática (miniaturas y fichas). En el catálogo importado es el
  // fotograma .webp; en los ejercicios antiguos sin emparejar, el .gif.
  imageUrl: string;
  instructions: string[];
  defaultRestTime: number; // in seconds, e.g., 90
  isCustom?: boolean;
  // Fuerza la zona muscular (imagen anatómica) cuando el nombre engañaría a la
  // detección automática. Debe ser una de las claves de MuscleZone
  // (p. ej. 'hamstrings'). Si no se indica, la zona se deduce del nombre+grupo.
  zone?: string;

  // --- Campos del catálogo importado (todos opcionales) ---
  // Tipo de ejercicio: fuerza, estiramiento, yoga, cardio...
  category?: ExerciseCategory;
  // Vídeo corto (.mp4) del ejercicio. imageUrl es su fotograma estático.
  videoUrl?: string;
  // id de este ejercicio en el catálogo de origen (F:\ejercicios). Nombre de sus
  // archivos de vídeo/foto y clave para unificar ids más adelante.
  sourceId?: string;
  // Músculos secundarios, ya en español (solo informativo).
  secondaryMuscles?: string[];
  // Partes de la silueta (bodyPaths.ts) que trabaja: las principales cuentan
  // una serie entera y las secundarias media. Si falta, se deduce de la zona.
  bodyParts?: { primary: string[]; secondary: string[] };
  // Ejercicio isométrico de mantener una postura (se mide en tiempo).
  hold?: boolean;
  // Material necesario además del equipamiento principal (p. ej. "bench").
  needs?: string[];
  // Descripción corta (solo en el catálogo importado).
  description?: string;
}

export interface WorkoutSet {
  id: string;
  weight: number; // in kg
  reps: number;
  completed: boolean;
  isWarmup?: boolean;
  rpe?: number; // Rate of Perceived Exertion (0-10) or RIR equivalent
  // Tipo especial de serie de trabajo (el calentamiento sigue siendo isWarmup)
  setType?: 'drop' | 'failure' | 'restpause';
  // Descanso propio de esta serie (segundos; 0 = sin descanso). Si falta, se usa
  // el del ejercicio. Sirve para pirámides y series con descansos distintos.
  restTime?: number;
  // Cardio: distancia recorrida en km (el tiempo va en `reps`, en segundos).
  distance?: number;
}

export interface WorkoutExercise {
  id: string; // unique ID for this exercise instance in this routine/workout
  exerciseId: string;
  sets: WorkoutSet[];
  restTime?: number; // custom rest time in seconds for this exercise
  // Ejercicios consecutivos con el mismo supersetId forman una superserie
  supersetId?: string;
  // Ejercicios de repuesto, por orden de preferencia: si la máquina está
  // ocupada, se cambia por uno de ellos con un toque conservando las series.
  alternativeIds?: string[];
  // Las repeticiones se cuentan por lado (zancadas, trabajo a una mano...).
  perSide?: boolean;
  // Hecho en una semana de descarga: no cuenta como «la última vez» ni para progresar.
  deload?: boolean;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  exercises: WorkoutExercise[];
  dayOfWeek?: string; // Optional: e.g. "Lunes", "Pierna", etc.
  folder?: string; // Optional: nombre de la carpeta que agrupa esta rutina
  folderOrder?: number; // Posición de la carpeta en el listado (compartida por todas las rutinas de esa carpeta)
  sortOrder?: number; // Posición de la rutina dentro de su carpeta (o de "Sin carpeta")
}

export interface WorkoutLog {
  id: string;
  routineId?: string;
  routineName: string;
  date: string; // ISO string
  duration: number; // in seconds
  exercises: WorkoutExercise[];
}

/** Entrenamiento en curso: todavía no está en el historial, se guarda al finalizarlo. */
export interface ActiveWorkout {
  routineId?: string;
  routineName: string;
  startTime: string; // ISO
  exercises: WorkoutExercise[];
}
