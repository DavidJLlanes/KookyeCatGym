import { WorkoutLog, WorkoutSet } from '../types';

// Series completadas la última vez que se entrenó un ejercicio (el log más
// reciente que lo incluya). Se usa para prerrellenar los pesos/repeticiones al
// empezar una rutina, de forma que la mayoría de los días no haya que volver a
// escribirlos: se arranca con lo que se hizo la última vez y solo se ajusta lo
// que cambie.
export function getLastPerformanceSets(
  exerciseId: string,
  logs: WorkoutLog[]
): WorkoutSet[] | null {
  // logs no llega garantizado en orden de fecha (tras importar un backup los
  // logs se anteponen sin ordenar, y del servidor vienen en el orden que
  // devuelva la API), así que se ordena para que "la última vez" sea de verdad
  // la más reciente.
  const byDateDesc = [...logs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const log of byDateDesc) {
    // El ejercicio puede estar repartido en varios bloques del mismo log
    // (repetido o añadido a media sesión); se juntan todos para no perder
    // series.
    // (las semanas de descarga no cuentan: tras ellas se retoma la carga de antes)
    const matches = log.exercises.filter((le) => le.exerciseId === exerciseId && !le.deload);
    if (matches.length === 0) continue;
    const completed = matches.flatMap((m) => m.sets.filter((s) => s.completed));
    if (completed.length > 0) return completed;
  }
  return null;
}

// Aplica los valores de la última vez a las series de un ejercicio que se va a
// entrenar. Empareja por posición (serie 1 con serie 1, etc.); si esta vez hay
// más series que la última, las sobrantes reutilizan la última conocida. Si no
// hay histórico, se conservan los valores que ya traía la rutina.
export function applyLastPerformance(
  sets: WorkoutSet[],
  lastSets: WorkoutSet[] | null
): WorkoutSet[] {
  if (!lastSets || lastSets.length === 0) return sets;
  return sets.map((set, idx) => {
    const reference = lastSets[idx] ?? lastSets[lastSets.length - 1];
    if (!reference) return set;
    return { ...set, weight: reference.weight, reps: reference.reps };
  });
}
