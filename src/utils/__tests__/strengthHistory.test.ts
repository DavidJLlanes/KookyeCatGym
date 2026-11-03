import { describe, expect, it } from 'vitest';
import { cumulativeLifted, relativeStrengthHistory } from '../strengthHistory';
import { atgProgress } from '../atgStandards';
import { exercise, log, set } from './fixtures';

const bench = exercise('0025', 'Press de banca');
const plank = exercise('3298', 'Plancha', { hold: true } as any);

describe('historial de fuerza relativa', () => {
  const weights = [{ date: '2026-01-01', kg: 80 }, { date: '2026-02-01', kg: 100 }];

  it('compara el mejor 1RM de cada día con el peso de ese día', () => {
    const logs = [
      log('a', '2026-01-10T10:00:00', [{ exerciseId: '0025', sets: [set(80, 1)] }]),
      log('b', '2026-02-10T10:00:00', [{ exerciseId: '0025', sets: [set(100, 1)] }]),
    ];
    const [h] = relativeStrengthHistory(logs, [bench], weights);
    expect(h.points.map((p) => p.percent)).toEqual([100, 100]);
    expect(h.points.map((p) => p.bodyKg)).toEqual([80, 100]);
  });

  it('ignora calentamientos, series sin completar y ejercicios por tiempo', () => {
    const logs = [
      log('a', '2026-01-10T10:00:00', [
        { exerciseId: '0025', sets: [set(200, 5, { isWarmup: true }), set(150, 5, { completed: false })] },
        { exerciseId: '3298', sets: [set(0, 60)] },
      ]),
    ];
    expect(relativeStrengthHistory(logs, [bench, plank], weights)).toEqual([]);
  });

  it('sin pesajes no hay historial', () => {
    expect(relativeStrengthHistory([log('a', '2026-01-10T10:00:00', [{ exerciseId: '0025', sets: [set(80, 5)] }])], [bench], [])).toEqual([]);
  });

  it('acumula el total levantado día a día', () => {
    const logs = [
      log('b', '2026-01-12T10:00:00', [{ exerciseId: '0025', sets: [set(100, 10)] }]),
      log('a', '2026-01-10T10:00:00', [{ exerciseId: '0025', sets: [set(50, 10), set(60, 5, { isWarmup: true })] }]),
    ];
    expect(cumulativeLifted(logs, [bench]).map((p) => [p.day, p.total])).toEqual([[500, 500], [1000, 1500]]);
  });
});

describe('estándares ATG', () => {
  it('calcula el objetivo con el peso actual y el progreso con las repeticiones pedidas', () => {
    const today = new Date().toISOString().slice(0, 10);
    const entries = [{ date: '2020-01-01', kg: 80 }];
    const logs = [
      log('a', today, [{ exerciseId: '0085', sets: [set(60, 10), set(100, 5)] }]), // 100 kg con 5 reps no cuenta
    ];
    const rdl = atgProgress(logs, entries).find((r) => r.standard.id === 'rdl')!;
    expect(rdl.targetKg).toBe(80);
    expect(rdl.bestKg).toBe(60);
    expect(rdl.progress).toBeCloseTo(0.75);
    expect(today).toBeTruthy();
  });
});
