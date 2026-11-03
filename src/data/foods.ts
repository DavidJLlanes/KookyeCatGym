import { Food } from '../utils/nutrition/types';

/**
 * Alimentos básicos de arranque, por 100 g (valores medios aproximados, en
 * crudo salvo que se indique). Las cifras reales varían según marca y
 * preparación: para algo exacto, crea tu propio alimento con la etiqueta.
 */
type Row = [name: string, kcal: number, protein: number, carbs: number, fat: number, servingG?: number, servingLabel?: string];

const ROWS: Row[] = [
  // Carnes y aves
  ['Pechuga de pollo', 110, 23, 0, 1.5],
  ['Muslo de pollo (sin piel)', 120, 20, 0, 4.5],
  ['Pavo (pechuga)', 105, 23, 0, 1],
  ['Ternera magra', 130, 21, 0, 5],
  ['Cerdo (lomo)', 150, 21, 0, 7],
  ['Carne picada mixta', 220, 18, 0, 16],
  ['Jamón serrano', 240, 30, 0, 13, 25, 'loncha'],
  ['Jamón cocido', 110, 17, 1, 4, 20, 'loncha'],
  ['Lomo embuchado', 260, 40, 1, 11],
  ['Pechuga de pavo en lonchas', 90, 17, 2, 1.5, 20, 'loncha'],
  // Pescado y marisco
  ['Salmón', 200, 20, 0, 13],
  ['Merluza', 80, 17, 0, 1],
  ['Atún en lata al natural', 110, 25, 0, 1],
  ['Atún en aceite (escurrido)', 200, 27, 0, 10],
  ['Bacalao fresco', 80, 18, 0, 0.7],
  ['Sardinas en lata', 210, 24, 0, 12],
  ['Gambas', 85, 18, 0.5, 1],
  ['Dorada', 100, 19, 0, 2.5],
  // Huevos y lácteos
  ['Huevo entero', 145, 12.5, 1, 10, 60, 'huevo'],
  ['Clara de huevo', 50, 11, 0.7, 0.2, 33, 'clara'],
  ['Leche entera', 63, 3.3, 4.8, 3.6, 250, 'vaso'],
  ['Leche semidesnatada', 46, 3.4, 4.8, 1.6, 250, 'vaso'],
  ['Leche desnatada', 35, 3.4, 4.9, 0.1, 250, 'vaso'],
  ['Yogur natural', 61, 3.8, 4.7, 3.3, 125, 'yogur'],
  ['Yogur griego natural', 120, 5, 4, 9, 125, 'yogur'],
  ['Yogur proteico', 55, 10, 4, 0.2, 150, 'yogur'],
  ['Skyr natural', 63, 11, 4, 0.2],
  ['Queso fresco batido 0%', 47, 8, 4, 0.2],
  ['Requesón', 98, 11, 3.4, 4.3],
  ['Queso curado', 400, 25, 0.5, 33, 30, 'cuña'],
  ['Queso mozzarella', 260, 18, 2, 20],
  ['Queso en lonchas', 300, 20, 2, 23, 20, 'loncha'],
  ['Mantequilla', 740, 0.6, 0.6, 82, 10, 'cucharadita'],
  // Legumbres
  ['Lentejas (cocidas)', 115, 9, 20, 0.4],
  ['Garbanzos (cocidos)', 165, 9, 27, 2.6],
  ['Alubias blancas (cocidas)', 120, 8, 20, 0.5],
  ['Lentejas (secas)', 340, 24, 55, 1.5],
  ['Garbanzos (secos)', 360, 20, 55, 6],
  ['Soja texturizada', 330, 50, 25, 1],
  ['Tofu firme', 120, 13, 2, 7],
  ['Hummus', 230, 8, 14, 16],
  // Cereales y derivados
  ['Arroz blanco (crudo)', 355, 7, 78, 0.6],
  ['Arroz blanco (cocido)', 130, 2.7, 28, 0.3],
  ['Arroz integral (crudo)', 350, 7.5, 74, 2.5],
  ['Pasta (cruda)', 355, 12, 72, 1.5],
  ['Pasta (cocida)', 150, 5.5, 30, 0.9],
  ['Pan blanco', 265, 9, 50, 3, 30, 'rebanada'],
  ['Pan integral', 245, 9, 44, 3.5, 30, 'rebanada'],
  ['Pan de molde integral', 250, 10, 42, 4, 30, 'rebanada'],
  ['Tostada de pan integral', 270, 10, 46, 4, 25, 'tostada'],
  ['Avena (copos)', 370, 13, 60, 7, 40, 'ración'],
  ['Cereales de desayuno (maíz)', 380, 7, 84, 1.5, 30, 'ración'],
  ['Tortita de arroz', 380, 8, 80, 3, 9, 'tortita'],
  ['Tortilla de trigo (wrap)', 310, 8, 52, 7, 60, 'tortilla'],
  ['Quinoa (cruda)', 370, 14, 64, 6],
  ['Cuscús (crudo)', 360, 13, 73, 1.5],
  ['Harina de trigo', 350, 10, 73, 1.2],
  // Tubérculos y verduras
  ['Patata', 77, 2, 17, 0.1],
  ['Boniato', 86, 1.6, 20, 0.1],
  ['Brócoli', 34, 2.8, 7, 0.4],
  ['Coliflor', 25, 2, 5, 0.3],
  ['Espinacas', 23, 2.9, 3.6, 0.4],
  ['Lechuga', 15, 1.4, 2.9, 0.2],
  ['Tomate', 18, 0.9, 3.9, 0.2],
  ['Pepino', 15, 0.7, 3.6, 0.1],
  ['Zanahoria', 41, 0.9, 10, 0.2],
  ['Pimiento rojo', 31, 1, 6, 0.3],
  ['Cebolla', 40, 1.1, 9, 0.1],
  ['Calabacín', 17, 1.2, 3.1, 0.3],
  ['Judías verdes', 31, 1.8, 7, 0.2],
  ['Champiñones', 22, 3.1, 3.3, 0.3],
  ['Berenjena', 25, 1, 6, 0.2],
  ['Maíz dulce (lata)', 85, 2.5, 17, 1.2],
  // Frutas
  ['Plátano', 90, 1.1, 23, 0.3, 120, 'plátano'],
  ['Manzana', 52, 0.3, 14, 0.2, 180, 'manzana'],
  ['Naranja', 47, 0.9, 12, 0.1, 200, 'naranja'],
  ['Pera', 57, 0.4, 15, 0.1, 170, 'pera'],
  ['Fresas', 32, 0.7, 7.7, 0.3],
  ['Arándanos', 57, 0.7, 14, 0.3],
  ['Uvas', 69, 0.7, 18, 0.2],
  ['Sandía', 30, 0.6, 7.6, 0.2],
  ['Melón', 34, 0.8, 8, 0.2],
  ['Piña', 50, 0.5, 13, 0.1],
  ['Kiwi', 61, 1.1, 15, 0.5, 75, 'kiwi'],
  ['Aguacate', 160, 2, 9, 15, 150, 'aguacate'],
  ['Mandarina', 53, 0.8, 13, 0.3, 90, 'mandarina'],
  // Frutos secos, semillas y grasas
  ['Almendras', 600, 21, 7, 53, 30, 'puñado'],
  ['Nueces', 650, 15, 7, 65, 30, 'puñado'],
  ['Cacahuetes', 590, 26, 16, 49, 30, 'puñado'],
  ['Crema de cacahuete', 600, 25, 16, 50, 15, 'cucharada'],
  ['Pistachos', 580, 20, 18, 46, 30, 'puñado'],
  ['Semillas de chía', 490, 17, 8, 31, 15, 'cucharada'],
  ['Aceite de oliva', 884, 0, 0, 100, 10, 'cucharada'],
  ['Chocolate negro 85%', 590, 10, 20, 46, 10, 'onza'],
  // Bebidas y varios
  ['Zumo de naranja', 45, 0.7, 10, 0.2, 200, 'vaso'],
  ['Cerveza', 43, 0.5, 3.6, 0, 330, 'caña/botellín'],
  ['Vino tinto', 85, 0.1, 2.6, 0, 150, 'copa'],
  ['Azúcar', 400, 0, 100, 0, 5, 'cucharadita'],
  ['Miel', 304, 0.3, 82, 0, 20, 'cucharada'],
  ['Mermelada', 250, 0.4, 62, 0.1, 15, 'cucharada'],
  ['Proteína en polvo (whey)', 390, 78, 7, 6, 30, 'cacito'],
  ['Barrita de proteína', 370, 33, 35, 12, 50, 'barrita'],
  ['Tortilla de patata', 190, 6, 15, 12, 150, 'ración'],
  ['Pizza margarita', 250, 11, 33, 8],
  ['Hamburguesa de ternera', 250, 17, 0, 20, 100, 'hamburguesa'],
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Catálogo incluido en la app (no se guarda en el servidor). */
export const BASE_FOODS: Food[] = ROWS.map(([name, kcal, protein, carbs, fat, servingG, servingLabel]) => ({
  id: `base-${slug(name)}`,
  name,
  kcal,
  protein,
  carbs,
  fat,
  ...(servingG ? { servingG, servingLabel } : {}),
}));
