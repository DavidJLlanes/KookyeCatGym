// Tamaño de letra de toda la app. Los tamaños de Tailwind van en rem, así que
// basta con escalar el tamaño base del documento (html) y todo crece o se
// encoge a la vez. Se guarda en este dispositivo y se aplica al arrancar, antes
// de pintar nada, para que no haya un salto de tamaño al abrir.

export const FONT_SCALE_KEY = 'zgym-font-scale';

export interface FontScaleOption {
  id: string;
  label: string;
  scale: number;
}

// Los límites están pensados para que las pantallas estrechas (320 px) sigan
// cabiendo sin desbordar: el máximo se probó en pantallas de 320 a 430 px.
export const FONT_SCALES: FontScaleOption[] = [
  { id: 'small', label: 'Pequeña', scale: 0.9 },
  { id: 'normal', label: 'Normal', scale: 1 },
  { id: 'large', label: 'Grande', scale: 1.1 },
  { id: 'xlarge', label: 'Muy grande', scale: 1.2 },
];

export const DEFAULT_FONT_SCALE = 'normal';

export function loadFontScaleId(): string {
  try {
    const saved = localStorage.getItem(FONT_SCALE_KEY);
    if (saved && FONT_SCALES.some((o) => o.id === saved)) return saved;
  } catch {
    // almacenamiento bloqueado: se usa el tamaño normal
  }
  return DEFAULT_FONT_SCALE;
}

export function applyFontScale(id: string): void {
  const option = FONT_SCALES.find((o) => o.id === id) ?? FONT_SCALES[1];
  document.documentElement.style.setProperty('--font-scale', String(option.scale));
}

export function saveFontScale(id: string): void {
  applyFontScale(id);
  try {
    localStorage.setItem(FONT_SCALE_KEY, id);
  } catch {
    // sin almacenamiento: vale solo para esta sesión
  }
}
