import type { Exercise, WorkoutLog, WorkoutSet } from '../types';
import type { BodyWeightEntry } from './userData';
import { isHold, setVolume } from './holdSets';

// Exportación a CSV pensada para abrirse con doble clic en Excel/LibreOffice en
// español: separador ";", decimales con coma y BOM UTF-8 (para los acentos).

const SEP = ';';

/** Celda segura: comillas escapadas y neutralizado de fórmulas (=, +, -, @) que Excel ejecutaría. */
function cell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  let s = typeof value === 'number' ? numberEs(value) : String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function numberEs(n: number): string {
  if (!Number.isFinite(n)) return '';
  return String(Math.round(n * 1000) / 1000).replace('.', ',');
}

const line = (cols: Array<string | number | boolean | null | undefined>) => cols.map(cell).join(SEP);

const SET_TYPE_LABEL: Record<string, string> = { drop: 'Drop set', failure: 'Al fallo', restpause: 'Rest-pause' };

function setKind(s: WorkoutSet): string {
  if (s.isWarmup) return 'Calentamiento';
  return (s.setType && SET_TYPE_LABEL[s.setType]) || 'Normal';
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Un renglón por serie: fecha, hora, rutina, ejercicio, grupo, nº, tipo, kg, reps o segundos, RPE, volumen. */
export function workoutsToCsv(logs: WorkoutLog[], exercises: Exercise[]): string {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const rows: string[] = [
    line(['Fecha', 'Hora', 'Rutina', 'Ejercicio', 'Grupo muscular', 'Serie', 'Tipo de serie', 'Peso (kg)', 'Repeticiones', 'Segundos', 'Distancia (km)', 'RPE/RIR', 'Completada', 'Volumen (kg)', 'Duración sesión (min)']),
  ];
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  for (const log of sorted) {
    const d = new Date(log.date);
    const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const minutes = Math.round(log.duration / 60);
    for (const we of log.exercises) {
      const ex = byId.get(we.exerciseId);
      const timed = isHold(ex);
      let n = 0;
      for (const s of we.sets) {
        n += 1;
        rows.push(
          line([
            day,
            time,
            log.routineName,
            ex?.name ?? we.exerciseId,
            ex?.muscleGroup ?? '',
            n,
            setKind(s),
            s.weight,
            timed ? null : s.reps,
            timed ? s.reps : null,
            s.distance ?? null,
            s.rpe ?? null,
            s.completed ? 'Sí' : 'No',
            s.completed && !s.isWarmup ? setVolume(s.weight, s.reps, ex) : 0,
            minutes,
          ])
        );
      }
    }
  }
  return rows.join('\r\n') + '\r\n';
}

/** Pesajes corporales: fecha y kg, ordenados. */
export function bodyWeightsToCsv(entries: BodyWeightEntry[]): string {
  const rows = [line(['Fecha', 'Peso (kg)'])];
  for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date))) rows.push(line([e.date, e.kg]));
  return rows.join('\r\n') + '\r\n';
}

/** Descarga un CSV (con BOM para que Excel reconozca los acentos). */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
