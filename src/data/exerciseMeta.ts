// Metadatos ligeros (grupos musculares, equipamiento, tipos, colores) separados
// del catálogo (data/exercises.ts + data/catalog.json, varios MB) para que los
// componentes que solo necesitan esto no arrastren esa carga al bundle.
//
// Es la ÚNICA fuente de verdad de estas listas: los tipos de Exercise se
// derivan de aquí, así que añadir un valor nuevo solo requiere tocar este
// archivo (más sus colores/zonas, que tsc señalará si faltan).

// Los 6 primeros son los grupos de siempre (el orden anatómico de la app);
// los 3 últimos cubren lo que no es un músculo concreto.
export const MUSCLE_GROUPS = [
  'Pecho',
  'Espalda',
  'Piernas',
  'Hombros',
  'Brazos',
  'Abdomen',
  'Cuello',
  'Cuerpo completo',
  'Cardio',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

// Los 5 primeros son los de siempre. Los valores nuevos se agrupan por familia.
export const EQUIPMENT_TYPES = [
  'Barra',
  'Mancuernas',
  'Polea',
  'Máquina',
  'Peso Corporal',
  'Kettlebell',
  'Banda elástica',
  'Barra EZ',
  'Máquina Smith',
  'Barra hexagonal',
  'Landmine',
  'Disco',
  'Lastre',
  'Asistido',
  'Suspensión (TRX)',
  'Cuerda',
  'Balón de estabilidad',
  'Balón medicinal',
  'Bosu',
  'Rodillo / masaje',
  'Cardio (máquina)',
  'Otro',
] as const;
export type Equipment = (typeof EQUIPMENT_TYPES)[number];

// Tipo de ejercicio (concepto nuevo, opcional en cada ejercicio).
export const EXERCISE_CATEGORIES = [
  'Fuerza',
  'Calistenia',
  'Estiramiento',
  'Movilidad',
  'Pliométrico',
  'Isométrico',
  'Cardio',
  'Yoga',
  'Halterofilia',
  'Pilates',
  'Rehabilitación',
  'Combate',
] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export function getMuscleColor(group: string): string {
  switch (group) {
    case 'Pecho': return '#ef4444'; // Rojo
    case 'Espalda': return '#3b82f6'; // Azul
    case 'Piernas': return '#10b981'; // Verde
    case 'Hombros': return '#f59e0b'; // Ámbar
    case 'Brazos': return '#8b5cf6'; // Púrpura
    case 'Abdomen': return '#06b6d4'; // Cian
    case 'Cuello': return '#ec4899'; // Rosa
    case 'Cuerpo completo': return '#f97316'; // Naranja
    case 'Cardio': return '#84cc16'; // Lima
    default: return '#6b7280'; // Gris
  }
}
