export interface Exercise {
  id: string;
  name: string;
  muscleGroup: 'Pecho' | 'Espalda' | 'Piernas' | 'Hombros' | 'Brazos' | 'Abdomen';
  equipment: 'Barra' | 'Mancuernas' | 'Polea' | 'Máquina' | 'Peso Corporal';
  imageUrl: string;
  instructions: string[];
  defaultRestTime: number; // in seconds, e.g., 90
  isCustom?: boolean;
  // Fuerza la zona muscular (imagen anatómica) cuando el nombre engañaría a la
  // detección automática. Debe ser una de las claves de MuscleZone
  // (p. ej. 'hamstrings'). Si no se indica, la zona se deduce del nombre+grupo.
  zone?: string;
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
}

export interface WorkoutExercise {
  id: string; // unique ID for this exercise instance in this routine/workout
  exerciseId: string;
  sets: WorkoutSet[];
  restTime?: number; // custom rest time in seconds for this exercise
  // Ejercicios consecutivos con el mismo supersetId forman una superserie
  supersetId?: string;
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
