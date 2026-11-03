import { describe, expect, it } from 'vitest';
import { joinBase } from '../assetUrl';

describe('joinBase', () => {
  it('no cambia nada en la raíz', () => {
    expect(joinBase('/', '/exercises/a.webp')).toBe('/exercises/a.webp');
  });
  it('antepone la subcarpeta a las rutas absolutas', () => {
    expect(joinBase('/gym/', '/exercises/a.webp')).toBe('/gym/exercises/a.webp');
    expect(joinBase('/gym/', '/api/media?h=abc')).toBe('/gym/api/media?h=abc');
  });
  it('respeta URLs externas, relativas, blob y las que ya llevan la subcarpeta', () => {
    expect(joinBase('/gym/', 'https://x.com/a.png')).toBe('https://x.com/a.png');
    expect(joinBase('/gym/', '//cdn.x.com/a.png')).toBe('//cdn.x.com/a.png');
    expect(joinBase('/gym/', 'blob:abc')).toBe('blob:abc');
    expect(joinBase('/gym/', '/gym/exercises/a.webp')).toBe('/gym/exercises/a.webp');
    expect(joinBase('/gym/', '/gymnastics/a.webp')).toBe('/gym/gymnastics/a.webp');
  });
});
