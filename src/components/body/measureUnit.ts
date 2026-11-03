import { MeasureUnit, formatMeasure } from '../../utils/photoTools';

const UNIT_KEY = 'kookyecatgym-measure-unit';

/** Unidad de medida preferida (cm por defecto); recordada en el navegador. */
export function loadUnit(): MeasureUnit {
  try {
    return localStorage.getItem(UNIT_KEY) === 'mm' ? 'mm' : 'cm';
  } catch {
    return 'cm';
  }
}

export function saveUnit(unit: MeasureUnit) {
  try {
    localStorage.setItem(UNIT_KEY, unit);
  } catch {
    // sin almacenamiento: solo dura esta sesión
  }
}

/** Diferencia entre dos medidas, con signo (p. ej. «+1,5 cm»). */
export function diffLabel(mm: number, unit: MeasureUnit): string {
  if (mm === 0) return 'sin cambios';
  return `${mm > 0 ? '+' : '−'}${formatMeasure(Math.abs(mm), unit)}`;
}
