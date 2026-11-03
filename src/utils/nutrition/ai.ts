import { Macros, MealId, LogEntry } from './types';

/** Tipos de las respuestas de la IA de Nutrición (ya validadas por el servidor). */
export interface AiMeta { proveedor: string; modelo: string }

export interface EstimatedFood extends Macros { name: string; grams: number }
export interface EstimateResult extends AiMeta { alimentos: EstimatedFood[]; nota: string }

export interface Recipe {
  titulo: string;
  raciones: number;
  minutos: number;
  ingredientes: { nombre: string; cantidad: string }[];
  pasos: string[];
  porRacion: Macros;
}
export interface RecipesResult extends AiMeta { recetas: Recipe[] }

export interface PlanMeal { comida: string; plato: string; kcal: number; proteina: number }
export interface PlanResult extends AiMeta { dias: { dia: string; comidas: PlanMeal[] }[]; compra: string[]; nota: string }

export interface AnalysisResult extends AiMeta { resumen: string; sugerencias: { titulo: string; detalle: string }[] }

export interface AiTaskMap {
  estimate: { input: { text: string }; result: EstimateResult };
  recipes: {
    input: { foods: string[]; meal?: string; servings?: number; remaining?: Macros | null; notes?: string };
    result: RecipesResult;
  };
  plan: { input: { targets: Macros; days: number; notes?: string }; result: PlanResult };
  analysis: { input: { targets: Macros; week: (Macros & { date: string; logged: boolean })[] }; result: AnalysisResult };
}
export type AiTask = keyof AiTaskMap;

/** Convierte una estimación de la IA en una entrada del diario (el usuario ya la ha revisado). */
export function entryFromEstimate(food: EstimatedFood, meal: MealId): Omit<LogEntry, 'id'> {
  return {
    meal,
    name: food.name,
    grams: food.grams > 0 ? food.grams : undefined,
    kcal: food.kcal,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
  };
}

/** Una ración de receta como entrada del diario. */
export function entryFromRecipe(recipe: Recipe, meal: MealId): Omit<LogEntry, 'id'> {
  return { meal, name: recipe.titulo, ...recipe.porRacion };
}

/** Los alimentos que escribe el usuario, separados por comas, saltos de línea o punto y coma. */
export function parseFoodList(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => {
      const k = s.toLowerCase();
      if (!s || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 25);
}
