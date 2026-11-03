import { Dispatch, SetStateAction } from 'react';
import { Exercise, Routine, WorkoutLog } from '../types';
import * as api from '../api/client';
import { ImportOutcome } from '../components/ImportPanel';
import { UserDataShape as UserData } from '../utils/userData';
import { bodyWeightsToCsv, downloadCsv, workoutsToCsv } from '../utils/csvExport';
import { remapWorkoutList } from '../utils/exerciseIds';

interface DataTransferDeps {
  exercises: Exercise[];
  routines: Routine[];
  logs: WorkoutLog[];
  userData: UserData;
  setExercises: Dispatch<SetStateAction<Exercise[]>>;
  setLogs: Dispatch<SetStateAction<WorkoutLog[]>>;
  saveExercises: (items: Exercise[]) => Promise<void>;
  saveRoutines: (items: Routine[]) => Promise<void>;
  saveLogs: (items: WorkoutLog[]) => Promise<void>;
}

/**
 * Salida y entrada de datos: copia JSON, exportación a CSV, restauración y
 * importación desde otras apps (Hevy, Strong, FitNotes).
 */
export function useDataTransfer({
  exercises, routines, logs, userData, setExercises, setLogs, saveExercises, saveRoutines, saveLogs,
}: DataTransferDeps) {
  // Importación desde otra app (Hevy, Strong, FitNotes). Los registros se suben
  // de uno en uno (no en paralelo) para no saturar el servidor con cientos de
  // escrituras a la vez en SQLite; solo se añaden al historial los que el
  // servidor confirma.
  const handleImportWorkouts = async (
    newLogs: WorkoutLog[],
    newExercises: Exercise[],
    onProgress: (done: number, total: number) => void
  ): Promise<ImportOutcome> => {
    if (newExercises.length > 0) {
      const updatedExercises = [...newExercises, ...exercises];
      const customOnly = updatedExercises.filter((e) => e.isCustom);
      await api.saveExercises(customOnly);
      setExercises(updatedExercises);
      localStorage.setItem('hevy_exercises', JSON.stringify(customOnly));
    }

    const saved: WorkoutLog[] = [];
    let failed = 0;
    for (let i = 0; i < newLogs.length; i++) {
      try {
        await api.saveLog(newLogs[i]);
        saved.push(newLogs[i]);
      } catch {
        failed++;
      }
      onProgress(i + 1, newLogs.length);
    }

    if (saved.length > 0) {
      setLogs((prev) => {
        const prevIds = new Set(prev.map((l) => l.id));
        const merged = [...saved.filter((l) => !prevIds.has(l.id)), ...prev].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        localStorage.setItem('hevy_logs', JSON.stringify(merged));
        return merged;
      });
    }

    return { saved: saved.length, failed };
  };

  // --- BACKUP & RESTORE ACTIONS ---
  const handleExportData = () => {
    const backupData = {
      routines,
      logs,
      exercises: exercises.filter(e => e.isCustom) // only backup custom ones
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hevy_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportWorkoutsCsv = () => {
    downloadCsv(`entrenamientos_${new Date().toISOString().slice(0, 10)}.csv`, workoutsToCsv(logs, exercises));
  };

  const handleExportBodyCsv = () => {
    downloadCsv(`peso_corporal_${new Date().toISOString().slice(0, 10)}.csv`, bodyWeightsToCsv(userData['body-weights']));
  };

  /** Restaura una copia JSON fusionándola con lo existente. Devuelve true si se aplicó. */
  const handleRestoreBackup = (json: string, onRestored?: () => void): boolean => {
    try {
      const parsed = JSON.parse(json);
      // Una copia exportada antes de unificar los ids trae los ids antiguos
      if (Array.isArray(parsed.routines)) parsed.routines = remapWorkoutList(parsed.routines);
      if (Array.isArray(parsed.logs)) parsed.logs = remapWorkoutList(parsed.logs);
      if (parsed.routines && Array.isArray(parsed.routines)) {
        const mergedRoutines = [...parsed.routines, ...routines.filter(r => !parsed.routines.some((pr: any) => pr.id === r.id))];
        saveRoutines(mergedRoutines);
      }
      if (parsed.logs && Array.isArray(parsed.logs)) {
        const mergedLogs = [...parsed.logs, ...logs.filter(l => !parsed.logs.some((pl: any) => pl.id === l.id))];
        saveLogs(mergedLogs);
      }
      if (parsed.exercises && Array.isArray(parsed.exercises)) {
        const mergedExercises = [...exercises, ...parsed.exercises.filter((pe: any) => !exercises.some(e => e.id === pe.id))];
        saveExercises(mergedExercises);
      }
      alert('¡Copia de seguridad restaurada correctamente!');
      onRestored?.();
      return true;
    } catch (err) {
      alert('Error al restaurar los datos. Por favor, asegúrate de que el formato JSON es válido.');
      return false;
    }
  };



  return { handleImportWorkouts, handleExportData, handleExportWorkoutsCsv, handleExportBodyCsv, handleRestoreBackup };
}
