// Opciones del selector de descanso (la "rueda"): sin descanso y luego pasos
// cada vez más grandes hasta 15 minutos, para no tener 180 valores que girar.
export const MAX_REST_SECONDS = 15 * 60;

function buildOptions(): number[] {
  const out: number[] = [0];
  for (let s = 5; s <= 120; s += 5) out.push(s); // de 5 s a 2 min, de 5 en 5
  for (let s = 135; s <= 300; s += 15) out.push(s); // hasta 5 min, de 15 en 15
  for (let s = 330; s <= MAX_REST_SECONDS; s += 30) out.push(s); // hasta 15 min, de 30 en 30
  return out;
}

export const REST_OPTIONS: number[] = buildOptions();

/** 0 → "Sin descanso", 90 → "1:30", 45 → "45 s", 600 → "10:00". */
export function formatRest(seconds: number): string {
  if (seconds <= 0) return 'Sin descanso';
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Valor de la rueda más cercano a unos segundos cualesquiera. */
export function nearestRestOption(seconds: number): number {
  const clamped = Math.min(MAX_REST_SECONDS, Math.max(0, Math.round(seconds)));
  return REST_OPTIONS.reduce((best, o) => (Math.abs(o - clamped) < Math.abs(best - clamped) ? o : best), 0);
}
