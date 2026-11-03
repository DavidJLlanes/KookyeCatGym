import { Exercise, Routine, WorkoutLog } from '../types';
import { ConfirmFn } from './useConfirmDialog';

interface LibraryDeps {
  routines: Routine[];
  exercises: Exercise[];
  logs: WorkoutLog[];
  saveRoutines: (items: Routine[]) => Promise<void>;
  saveExercises: (items: Exercise[]) => Promise<void>;
  saveLogs: (items: WorkoutLog[]) => Promise<void>;
  confirm: ConfirmFn;
}

/** Altas, bajas y cambios de rutinas, ejercicios propios e historial. */
export function useLibraryActions({ routines, exercises, logs, saveRoutines, saveExercises, saveLogs, confirm }: LibraryDeps) {
  // Edit/Create Routine
  const handleSaveRoutine = (routine: Routine) => {
    const exists = routines.some((r) => r.id === routine.id);
    let updated;
    if (exists) {
      updated = routines.map((r) => (r.id === routine.id ? routine : r));
    } else {
      updated = [routine, ...routines];
    }
    saveRoutines(updated);
  };

  // Reordenar carpetas/rutinas: recibe las rutinas cuya posición cambió
  // (folderOrder y/o sortOrder) y las fusiona con el resto sin tocarlas.
  // Varias rutinas nuevas de golpe (planes de iniciación): una sola escritura,
  // para que ninguna pise a la anterior.
  const handleAddRoutines = (newRoutines: Routine[]) => {
    saveRoutines([...newRoutines, ...routines]);
  };

  const handleReorderRoutines = (updatedRoutines: Routine[]) => {
    const updatedById = new Map(updatedRoutines.map((r) => [r.id, r]));
    const merged = routines.map((r) => updatedById.get(r.id) ?? r);
    saveRoutines(merged);
  };

  // Borrado en bloque, sin diálogo propio: lo usa el panel de rutinas al
  // eliminar una carpeta entera (ya confirma él, y así no se encadenan N
  // confirmaciones seguidas, una por rutina).
  const handleDeleteRoutines = (routineIds: string[]) => {
    const ids = new Set(routineIds);
    saveRoutines(routines.filter((r) => !ids.has(r.id)));
  };

  const handleDeleteRoutine = (routineId: string) => {
    confirm({
      title: 'Eliminar Rutina',
      message: '¿Estás seguro de que deseas eliminar esta rutina de forma permanente?',
      confirmText: 'Eliminar',
      type: 'danger',
      onConfirm: () => {
        const updated = routines.filter((r) => r.id !== routineId);
        saveRoutines(updated);
      },
    });
  };

  const handleAddCustomExercise = (ex: Exercise) => {
    const updated = [ex, ...exercises];
    saveExercises(updated);
  };

  // Delete historical workout log
  const handleDeleteLog = (logId: string) => {
    confirm({
      title: 'Eliminar Registro de Historial',
      message: '¿Seguro que deseas eliminar este registro de entrenamiento de tu historial?',
      confirmText: 'Eliminar',
      type: 'danger',
      onConfirm: () => {
        const updated = logs.filter((l) => l.id !== logId);
        saveLogs(updated);
      },
    });
  };

  return {
    handleSaveRoutine, handleAddRoutines, handleReorderRoutines, handleDeleteRoutines,
    handleDeleteRoutine, handleAddCustomExercise, handleDeleteLog,
  };
}
