// Plate Math: Calculate the number of each plate size needed for a barbell

export interface PlateConfig {
  barWeight: number; // kg
  availablePlates: number[]; // kg per plate, sorted descending (e.g., [20, 15, 10, 5, 2.5, 1.25, 0.5])
}

export interface PlateResult {
  success: boolean;
  totalWeight: number;
  perSide: number;
  plates: Array<{ weight: number; count: number }>;
  message?: string;
}

const STANDARD_PLATES = [20, 15, 10, 5, 2.5, 1.25, 0.5];
const COMMON_BARS = {
  standard: 20, // olimpic bar
  short: 15, // EZ bar
  smith: 20,
};

export function calculatePlates(targetWeight: number, config?: Partial<PlateConfig>): PlateResult {
  const barWeight = config?.barWeight ?? COMMON_BARS.standard;
  const availablePlates = config?.availablePlates ?? STANDARD_PLATES;

  if (targetWeight < barWeight) {
    return {
      success: false,
      totalWeight: barWeight,
      perSide: 0,
      plates: [],
      message: `Peso objetivo (${targetWeight}kg) menor que la barra (${barWeight}kg)`,
    };
  }

  const remainingWeight = targetWeight - barWeight;
  if (remainingWeight % 2 !== 0) {
    return {
      success: false,
      totalWeight: barWeight,
      perSide: 0,
      plates: [],
      message: 'La diferencia debe ser divisible por 2 (se necesita lo mismo a cada lado)',
    };
  }

  const perSide = remainingWeight / 2;
  const plates: Array<{ weight: number; count: number }> = [];

  let remaining = perSide;
  for (const plateWeight of availablePlates) {
    if (remaining === 0) break;
    const count = Math.floor(remaining / plateWeight);
    if (count > 0) {
      plates.push({ weight: plateWeight, count });
      remaining -= count * plateWeight;
    }
  }

  // Check for precision error
  if (Math.abs(remaining) > 0.001) {
    return {
      success: false,
      totalWeight: barWeight,
      perSide: perSide,
      plates: [],
      message: `No se puede hacer exactamente ${targetWeight}kg con los discos disponibles`,
    };
  }

  return {
    success: true,
    totalWeight: targetWeight,
    perSide,
    plates,
  };
}

// Format the result for display
export function formatPlateResult(result: PlateResult): string {
  if (!result.success) {
    return result.message || 'Error al calcular discos';
  }

  const perSideLine = result.plates.map((p) => `${p.count}×${p.weight}kg`).join(' + ');
  return `${perSideLine} por lado`;
}

// Get common weight targets as suggestions
export function getCommonWeights(): number[] {
  const bars = [20, 15]; // standard y short bars
  const increments = [5, 10, 15, 20];
  const weights: number[] = [];

  for (const bar of bars) {
    for (const inc of increments) {
      for (let i = 0; i < 10; i++) {
        weights.push(bar + inc * i);
      }
    }
  }

  return [...new Set(weights)].sort((a, b) => a - b);
}
