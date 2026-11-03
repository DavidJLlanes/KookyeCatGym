import { describe, expect, it } from 'vitest';
import { PROGRAMS } from '../../data/programs';
import { bumpedMaxes, buildProgramRoutine, mainLifts, programPosition, roundToStep, sessionName, suggestTrainingMax } from '../programs';
import { log, set } from './fixtures';

const program = PROGRAMS[0];
const active = { programId: program.id, startDate: '2026-01-01', trainingMaxes: { '1436': 100, '0025': 80, '0032': 120, '1162': 50 } };

describe('programas', () => {
  it('redondea a 2,5 kg', () => {
    expect(roundToStep(66.3)).toBe(67.5);
    expect(roundToStep(65)).toBe(65);
  });

  it('calcula la carga de los principales a partir del máximo', () => {
    const r = buildProgramRoutine(program, active, 0, 0);
    expect(r.exercises[0].sets.map((s) => [s.weight, s.reps])).toEqual([[65, 5], [75, 5], [85, 5]]);
  });

  it('limita las series de un principal con `sets` (peso muerto: 3 de la semana de 1)', () => {
    const r = buildProgramRoutine(program, active, 2, 2); // semana de 1, peso muerto
    expect(r.exercises[0].sets.map((s) => [s.weight, s.reps])).toEqual([[90, 5], [102.5, 3], [115, 1]]);
  });

  it('los accesorios llevan series y repeticiones fijas con peso 0', () => {
    const r = buildProgramRoutine(program, active, 0, 0);
    expect(r.exercises[1].sets).toHaveLength(3);
    expect(r.exercises[1].sets.every((s) => s.weight === 0 && s.reps === 10)).toBe(true);
  });

  it('todas las semanas son coherentes: esquemas no vacíos y porcentajes razonables', () => {
    for (const p of PROGRAMS) {
      expect(p.weeks.length).toBeGreaterThan(0);
      for (const w of p.weeks) {
        expect(w.scheme.length).toBeGreaterThan(0);
        for (const s of w.scheme) {
          expect(s.percent).toBeGreaterThan(0);
          expect(s.percent).toBeLessThanOrEqual(100);
        }
      }
      expect(mainLifts(p).length).toBeGreaterThan(0);
    }
  });

  it('sitúa la siguiente sesión contando los entrenamientos del programa', () => {
    expect(programPosition(program, active, [])).toMatchObject({ done: 0, week: 0, day: 0, finished: false });
    const logs = [0, 1, 2, 3, 4].map((i) => log(`l${i}`, '2026-02-0' + (i + 1), [], sessionName(program, 0, 0)));
    // 5 sesiones con 4 días por semana → semana 2, día 2
    expect(programPosition(program, active, logs)).toMatchObject({ done: 5, week: 1, day: 1 });
  });

  it('no cuenta entrenamientos de antes del inicio ni de otro nombre', () => {
    const old = log('old', '2025-12-31', [], sessionName(program, 0, 0));
    const other = log('other', '2026-02-01', [], 'Otra rutina');
    expect(programPosition(program, active, [old, other]).done).toBe(0);
  });

  it('marca el programa como terminado', () => {
    const logs = Array.from({ length: 16 }, (_, i) => log(`l${i}`, '2026-03-01', [], sessionName(program, 0, 0)));
    expect(programPosition(program, active, logs).finished).toBe(true);
  });

  it('sugiere el 90 % del mejor 1RM reciente', () => {
    const recent = new Date(Date.now() - 5 * 86400000).toISOString();
    const logs = [log('a', recent, [{ exerciseId: '0025', sets: [set(100, 1)] }])];
    expect(suggestTrainingMax('0025', logs)).toBe(90);
    expect(suggestTrainingMax('9999', logs)).toBeNull();
  });

  it('sube los máximos: +5 kg sentadilla/peso muerto, +2,5 kg el resto', () => {
    expect(bumpedMaxes({ '1436': 100, '0032': 120, '0025': 80 })).toEqual({ '1436': 105, '0032': 125, '0025': 82.5 });
  });
});
