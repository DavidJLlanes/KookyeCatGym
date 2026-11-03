import type { WorkoutLog } from '../types';
import { formatEsNumber } from './number';
import { FONT_FAMILY, fitText, roundedRect } from './shareCanvas';

// Pegatina con el resumen del entrenamiento sobre una foto del usuario.
// Tamaño de salida fijo (4:5, el de las historias/publicaciones) y la pegatina
// se coloca por su centro, en fracciones del lienzo, para que el arrastre
// funcione igual en pantalla pequeña y grande.

export const STICKER_W = 1080;
export const STICKER_H = 1350;
const BASE_W = 640;
const BASE_H = 300;

export interface StickerOpts {
  log: WorkoutLog;
  hasRecord: boolean;
  /** Foto de fondo; sin ella se pinta un fondo liso. */
  photo: HTMLImageElement | null;
  /** Centro de la pegatina, 0-1 en cada eje. */
  cx: number;
  cy: number;
  /** 1 = tamaño base. */
  scale: number;
}

export interface SessionStats {
  minutes: number;
  volume: number;
  sets: number;
  exercises: number;
}

export function sessionStats(log: WorkoutLog): SessionStats {
  let sets = 0;
  let volume = 0;
  let exercises = 0;
  for (const we of log.exercises) {
    const done = we.sets.filter((s) => s.completed);
    if (done.length > 0) exercises += 1;
    for (const s of done) {
      sets += 1;
      volume += s.weight * s.reps;
    }
  }
  return { minutes: Math.round(log.duration / 60), volume, sets, exercises };
}

/** Limita el centro para que la pegatina no se salga del lienzo. */
export function clampCenter(cx: number, cy: number, scale: number): { cx: number; cy: number } {
  const hx = (BASE_W * scale) / 2 / STICKER_W;
  const hy = (BASE_H * scale) / 2 / STICKER_H;
  return { cx: Math.min(1 - hx, Math.max(hx, cx)), cy: Math.min(1 - hy, Math.max(hy, cy)) };
}

function drawBackground(ctx: CanvasRenderingContext2D, photo: HTMLImageElement | null) {
  if (!photo) {
    const g = ctx.createLinearGradient(0, 0, STICKER_W, STICKER_H);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STICKER_W, STICKER_H);
    return;
  }
  // "cover": rellena el lienzo recortando lo que sobre, sin deformar
  const k = Math.max(STICKER_W / photo.width, STICKER_H / photo.height);
  const w = photo.width * k;
  const h = photo.height * k;
  ctx.drawImage(photo, (STICKER_W - w) / 2, (STICKER_H - h) / 2, w, h);
}

function drawSticker(ctx: CanvasRenderingContext2D, { log, hasRecord, cx, cy, scale }: StickerOpts) {
  const stats = sessionStats(log);
  const accent = hasRecord ? '#f59e0b' : '#3b82f6';
  const x = cx * STICKER_W - (BASE_W * scale) / 2;
  const y = cy * STICKER_H - (BASE_H * scale) / 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
  roundedRect(ctx, 0, 0, BASE_W, BASE_H, 36);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = accent;
  ctx.font = `800 22px ${FONT_FAMILY}`;
  ctx.fillText(hasRecord ? 'KOOKYECATGYM · ¡NUEVO RÉCORD!' : 'KOOKYECATGYM', 36, 54);

  ctx.fillStyle = '#ffffff';
  ctx.font = `900 44px ${FONT_FAMILY}`;
  ctx.fillText(fitText(ctx, log.routineName, BASE_W - 72), 36, 112);

  ctx.fillStyle = '#94a3b8';
  ctx.font = `600 22px ${FONT_FAMILY}`;
  ctx.fillText(new Date(log.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }), 36, 148);

  const cols: [string, string][] = [
    [`${stats.minutes}`, 'min'],
    [stats.volume >= 1000 ? `${formatEsNumber(stats.volume / 1000, 1)} t` : `${formatEsNumber(stats.volume)} kg`, 'volumen'],
    [`${stats.sets}`, 'series'],
    [`${stats.exercises}`, 'ejercicios'],
  ];
  const colW = (BASE_W - 72) / cols.length;
  cols.forEach(([value, label], i) => {
    const colX = 36 + i * colW;
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 46px ${FONT_FAMILY}`;
    ctx.fillText(fitText(ctx, value, colW - 8), colX, 228);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 20px ${FONT_FAMILY}`;
    ctx.fillText(label, colX, 262);
  });
  ctx.restore();
}

/** Dibuja foto + pegatina en el lienzo y devuelve el PNG como data URL. */
export function renderStickerOnPhoto(canvas: HTMLCanvasElement, opts: StickerOpts): string {
  canvas.width = STICKER_W;
  canvas.height = STICKER_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawBackground(ctx, opts.photo);
  drawSticker(ctx, opts);
  return canvas.toDataURL('image/png');
}
