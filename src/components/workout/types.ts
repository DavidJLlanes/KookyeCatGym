import type { Exercise, WorkoutExercise, WorkoutSet } from '../../types';
import type { SetKind } from '../../utils/setTypes';

/** Acciones sobre una serie. Las recibe cada fila; el panel decide cómo aplicarlas. */
export interface SetActions {
  onField: (weId: string, setId: string, field: 'weight' | 'reps' | 'distance', value: number) => void;
  onToggleComplete: (weId: string, setId: string) => void;
  onKind: (weId: string, setId: string, kind: SetKind) => void;
  onRpe: (weId: string, setId: string, rpe: number | undefined) => void;
  onRemove: (weId: string, setId: string) => void;
  onDuplicate: (weId: string, setId: string) => void;
  onAdd: (weId: string) => void;
}

/** Acciones sobre un ejercicio de la sesión (menú «⋯»). */
export interface ExerciseActions extends SetActions {
  onHistory: (exercise: Exercise) => void;
  onTogglePerSide: (weId: string) => void;
  onToggleSuperset: (index: number) => void;
  onRemoveExercise: (weId: string) => void;
  onSwap: (weId: string, alternativeId: string) => void;
  /** Empieza el cronómetro de una serie por tiempo (plancha, colgado...). */
  onStartHold: (we: WorkoutExercise, set: WorkoutSet, exerciseName: string) => void;
}

export type WorkoutView = 'cards' | 'list';

/** Columnas de la tabla de series: Serie | Peso | Reps | RPE | Hecho | Quitar (ancho fijo en las tres últimas). */
export const SET_ROW_COLUMNS = '2rem minmax(0,1fr) minmax(0,1fr) 2.25rem 2.25rem 1.75rem';
