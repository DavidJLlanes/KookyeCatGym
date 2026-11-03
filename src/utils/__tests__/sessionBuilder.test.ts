import { describe, expect, it } from 'vitest';
import { pickSessionExercises } from '../sessionBuilder';
import { exercise, log, set } from './fixtures';

const chest = (id: string, extra = {}) => exercise(id, `Pecho ${id}`, { bodyParts: { primary: ['chest'], secondary: [] }, ...extra } as any);
const base = { logs: [], favorites: [], equipment: { enabled: false, owned: [] }, random: () => 0 };

describe('sesión por músculos', () => {
  it('elige ejercicios cuyo trabajo principal es el músculo tocado', () => {
    const exs = [chest('1'), chest('2'), chest('3'), exercise('9', 'Curl', { bodyParts: { primary: ['biceps'], secondary: ['chest'] } } as any)];
    const picked = pickSessionExercises({ ...base, parts: ['chest'], exercises: exs });
    expect(picked.map((e) => e.id)).not.toContain('9');
    expect(picked).toHaveLength(2);
  });

  it('prioriza favoritos y ejercicios ya hechos', () => {
    const exs = [chest('1'), chest('2'), chest('3')];
    const logs = [log('a', '2026-01-01', [{ exerciseId: '2', sets: [set(10, 10)] }])];
    const picked = pickSessionExercises({ ...base, parts: ['chest'], exercises: exs, logs, favorites: ['3'] });
    expect(picked.map((e) => e.id)).toEqual(['3', '2']);
  });

  it('respeta el equipamiento y no repite ejercicios entre músculos', () => {
    const both = exercise('5', 'Mixto', { bodyParts: { primary: ['chest', 'biceps'], secondary: [] } } as any);
    const gym = chest('6', { equipment: 'Máquina' });
    const picked = pickSessionExercises({ ...base, parts: ['chest', 'biceps'], exercises: [both, gym], equipment: { enabled: true, owned: ['Barra'] } });
    expect(picked.map((e) => e.id)).toEqual(['5']);
  });
});
