// Pila de pesas real de una máquina: los pesos que de verdad puede poner (que
// pueden saltar de 5 en 5, con placas de 2,5 intermedias, con saltos
// irregulares...). La progresión y los botones +/− se ajustan a ella en lugar
// de proponer 62,5 kg en una máquina que solo tiene 60 y 65.

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Pesos de la pila ya limpios: números ≥ 0, sin repetidos, de menor a mayor. */
export function normalizeStack(values: number[]): number[] {
  return [...new Set(values.filter((n) => Number.isFinite(n) && n >= 0 && n <= 1000).map(round2))].sort((a, b) => a - b);
}

/**
 * Lee lo que escribe el usuario. Separadores: espacios o ";" (la coma es el
 * decimal: "7,5"; una coma al final de un número se ignora, así "10, 15, 20"
 * también vale). Rangos: "5-100/5" = de 5 a 100 de 5 en 5.
 * Devuelve la pila y, si algo no se entendió, el texto problemático.
 */
export function parseStackInput(text: string): { stack: number[]; error: string | null } {
  const out: number[] = [];
  const tokens = text.split(/[\s;]+/).map((t) => t.replace(/,+$/, '')).filter(Boolean);
  for (const token of tokens) {
    const range = token.match(/^(\d+(?:[.,]\d+)?)-(\d+(?:[.,]\d+)?)\/(\d+(?:[.,]\d+)?)$/);
    if (range) {
      const [from, to, step] = range.slice(1).map((x) => parseFloat(x.replace(',', '.')));
      if (!(step > 0) || to < from || (to - from) / step > 400) return { stack: [], error: token };
      for (let v = from; v <= to + 1e-9; v += step) out.push(round2(v));
      continue;
    }
    if (!/^\d+(?:[.,]\d+)?$/.test(token)) return { stack: [], error: token };
    out.push(parseFloat(token.replace(',', '.')));
  }
  return { stack: normalizeStack(out), error: null };
}

/** El peso de la pila más cercano (en empate, el más ligero). */
export function snapToStack(weight: number, stack: number[]): number {
  if (stack.length === 0) return weight;
  return stack.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best), stack[0]);
}

/** Un escalón arriba (+1) o abajo (−1) desde el peso actual; no se sale de los extremos. */
export function stepOnStack(weight: number, stack: number[], direction: 1 | -1): number {
  if (stack.length === 0) return weight;
  if (direction === 1) return stack.find((w) => w > weight + 1e-9) ?? stack[stack.length - 1];
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i] < weight - 1e-9) return stack[i];
  return stack[0];
}

/**
 * Peso tras sumar `increment` kg respetando la pila: el menor peso de la pila
 * que llega al objetivo (peso + incremento). Si la pila no llega, se queda en
 * el tope (o en el peso actual si ya lo supera).
 */
export function raiseOnStack(weight: number, increment: number, stack: number[]): number {
  if (stack.length === 0) return round2(weight + increment);
  const target = weight + increment;
  const found = stack.find((w) => w >= target - 1e-9);
  if (found !== undefined) return found;
  return Math.max(weight, stack[stack.length - 1]);
}

export function formatStack(stack: number[]): string {
  return stack.map((n) => String(n).replace('.', ',')).join('  ');
}
