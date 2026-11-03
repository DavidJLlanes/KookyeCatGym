import { describe, expect, it } from 'vitest';
import { calculateAllBalances } from '../muscleBalance';
import { exercise, log, set } from './fixtures';

const recent = new Date(Date.now() - 3 * 86400000).toISOString();
const bench = exercise('b', 'Press de banca con barra');
const row = exercise('r', 'Remo con barra inclinado');
const curl = exercise('c', 'Curl femoral sentado', { equipment: 'Máquina' });
const ext = exercise('e', 'Extensión de piernas', { equipment: 'Máquina' });

describe('balance estructural por fuentes', () => {
  it('etiqueta cada ratio con su fuente y calcula Poliquin remo/banca 1:1', () => {
    const logs = [log('a', recent, [{ exerciseId: 'b', sets: [set(100, 1)] }, { exerciseId: 'r', sets: [set(100, 1)] }])];
    const balances = calculateAllBalances(logs, [bench, row]);
    const poliquin = balances.find((b) => b.source === 'poliquin');
    expect(poliquin?.ratio).toBe(1);
    expect(poliquin?.status).toBe('balanced');
    expect(balances.some((b) => b.source === 'general')).toBe(true);
  });

  it('isquios/cuádriceps al 75 % queda equilibrado en Poliquin y fuera de rango al 50 %', () => {
    const mk = (hamstring: number) => calculateAllBalances([log('a', recent, [{ exerciseId: 'c', sets: [set(hamstring, 1)] }, { exerciseId: 'e', sets: [set(100, 1)] }])], [curl, ext]).find((b) => b.source === 'poliquin')!;
    expect(mk(75).status).toBe('balanced');
    expect(mk(50).direction).toBe('low');
  });

  it('solo incluye ratios con datos en ambos lados', () => {
    const logs = [log('a', recent, [{ exerciseId: 'b', sets: [set(100, 1)] }])];
    expect(calculateAllBalances(logs, [bench, row])).toEqual([]);
  });
});
