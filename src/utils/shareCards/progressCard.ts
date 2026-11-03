import { formatEsCompactKg, formatEsNumber } from '../number';
import { getMuscleColor } from '../../data/exerciseMeta';
import { roundedRect, loadImage, drawCircularImage, fitText, FONT_FAMILY } from '../shareCanvas';
import { assetUrl } from '../assetUrl';
import { ShareVariant, W, M, USER_PHOTO_SRC} from './common';

// ─────────────────────────────────────────────────────────────────────────
// TARJETA: MI PROGRESO
// ─────────────────────────────────────────────────────────────────────────
export interface ProgressCardData {
  stats: { totalWorkouts: number; totalSetsLogged: number; totalKgLifted: number; streak: number; longestStreak: number };
  timeStats: { totalSeconds: number };
  formatDuration: (totalSeconds: number) => string;
  variant?: ShareVariant;
  // Datos de la versión completa:
  muscleDistribution?: { name: string; value: number; color: string }[];
  recentPrs?: { exerciseName: string; type: 'weight' | 'reps'; value: number; muscleGroup: string }[];
  topExercises?: { name: string; volume: number }[];
}

export async function renderProgressCard(canvas: HTMLCanvasElement, data: ProgressCardData): Promise<string> {
  const { stats, timeStats, formatDuration } = data;
  const variant = data.variant ?? 'compact';
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const nonZeroMuscle = (data.muscleDistribution ?? []).filter((m) => m.value > 0);
  const prRows = (data.recentPrs ?? []).slice(0, 4);
  const topRows = (data.topExercises ?? []).slice(0, 5);

  // Alto dinámico de la versión completa
  const sectionsStart = 1420; // las 5 tarjetas base terminan en 1360
  let sectionsH = 0;
  if (variant === 'full') {
    if (nonZeroMuscle.length) sectionsH += 84 + nonZeroMuscle.length * 66 + 40;
    if (prRows.length) sectionsH += 84 + prRows.length * 64 + 40;
    if (topRows.length) sectionsH += 84 + topRows.length * 60 + 40;
  }
  const CARD_H = variant === 'full' ? sectionsStart + sectionsH + 100 : 1460;

  canvas.width = W;
  canvas.height = CARD_H;

  // Fondo
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bg.addColorStop(0, '#0b1220');
  bg.addColorStop(0.55, '#020617');
  bg.addColorStop(1, '#000000');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, CARD_H);
  const glow = ctx.createRadialGradient(W * 0.85, 80, 20, W * 0.85, 80, 420);
  glow.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
  glow.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, CARD_H);

  const [logo, photo] = await Promise.all([loadImage(assetUrl('/icon-192.png')), loadImage(USER_PHOTO_SRC)]);

  // Marca + logo
  if (logo) {
    ctx.save();
    roundedRect(ctx, 900, 60, 108, 108, 24);
    ctx.clip();
    ctx.drawImage(logo, 900, 60, 108, 108);
    ctx.restore();
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 56px ${FONT_FAMILY}`;
  ctx.fillText('KookyeCatGym', M, 130);
  ctx.fillStyle = '#60a5fa';
  ctx.font = `700 30px ${FONT_FAMILY}`;
  ctx.fillText('Mi Progreso', M, 175);

  // Avatar del usuario (a la derecha)
  {
    const cx = 872;
    const cy = 452;
    const r = 132;
    const pGlow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.5);
    pGlow.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
    pGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = pGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
    ctx.fill();
    if (photo) {
      drawCircularImage(ctx, photo, cx, cy, r);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Héroe: racha
  const heroY = 260;
  ctx.fillStyle = '#f59e0b';
  ctx.font = `900 220px ${FONT_FAMILY}`;
  ctx.fillText(String(stats.streak), M, heroY + 200);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `700 40px ${FONT_FAMILY}`;
  ctx.fillText(stats.streak === 1 ? 'DÍA DE RACHA ACTIVA' : 'DÍAS DE RACHA ACTIVA', M, heroY + 260);

  // 5 tarjetas de stats
  const cards = [
    { label: 'ENTRENAMIENTOS', value: formatEsNumber(stats.totalWorkouts) },
    { label: 'RÉCORD DE RACHA', value: `${stats.longestStreak} días` },
    { label: 'SERIES COMPLETADAS', value: formatEsNumber(stats.totalSetsLogged) },
    { label: 'CARGA ACUMULADA', value: formatEsCompactKg(stats.totalKgLifted) },
    { label: 'TIEMPO TOTAL', value: formatDuration(timeStats.totalSeconds) },
  ];
  const gridTop = 720;
  const cardH = 108;
  const gap = 20;
  const cardW = W - 2 * M;
  cards.forEach((c, i) => {
    const y = gridTop + i * (cardH + gap);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    roundedRect(ctx, M, y, cardW, cardH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
    ctx.lineWidth = 2;
    roundedRect(ctx, M, y, cardW, cardH, 24);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 24px ${FONT_FAMILY}`;
    ctx.fillText(c.label, 108, y + 46);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 44px ${FONT_FAMILY}`;
    ctx.fillText(c.value, 108, y + 88);
  });

  // Secciones extra (solo full)
  if (variant === 'full') {
    let y = sectionsStart;

    if (nonZeroMuscle.length) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#60a5fa';
      ctx.font = `900 30px ${FONT_FAMILY}`;
      ctx.fillText('REPARTO POR GRUPO MUSCULAR', M, y + 34);
      y += 84;
      const maxV = Math.max(...nonZeroMuscle.map((m) => m.value));
      const barX = M + 210;
      const barMaxW = W - M - barX - 80;
      for (const m of nonZeroMuscle) {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = `700 28px ${FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.fillText(m.name, M, y + 38);
        ctx.fillStyle = 'rgba(51,65,85,0.4)';
        roundedRect(ctx, barX, y + 14, barMaxW, 30, 15);
        ctx.fill();
        const bw = Math.max(10, barMaxW * (m.value / maxV));
        ctx.fillStyle = m.color;
        roundedRect(ctx, barX, y + 14, bw, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.font = `700 26px ${FONT_FAMILY}`;
        ctx.textAlign = 'right';
        ctx.fillText(String(m.value), W - M, y + 40);
        y += 66;
      }
      y += 40;
    }

    if (prRows.length) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f59e0b';
      ctx.font = `900 30px ${FONT_FAMILY}`;
      ctx.fillText('ÚLTIMOS RÉCORDS', M, y + 34);
      y += 84;
      for (const p of prRows) {
        ctx.fillStyle = getMuscleColor(p.muscleGroup);
        ctx.beginPath();
        ctx.arc(M + 14, y + 20, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.font = `700 28px ${FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.fillText(fitText(ctx, p.exerciseName, W - M - 360), M + 44, y + 30);
        ctx.fillStyle = '#fbbf24';
        ctx.font = `800 28px ${FONT_FAMILY}`;
        ctx.textAlign = 'right';
        ctx.fillText(p.type === 'weight' ? `${formatEsNumber(p.value)} kg` : `${p.value} reps`, W - M, y + 30);
        y += 64;
      }
      y += 40;
    }

    if (topRows.length) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#60a5fa';
      ctx.font = `900 30px ${FONT_FAMILY}`;
      ctx.fillText('TOP EJERCICIOS POR VOLUMEN', M, y + 34);
      y += 84;
      topRows.forEach((t, i) => {
        ctx.fillStyle = '#475569';
        ctx.font = `900 30px ${FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.fillText(String(i + 1), M, y + 30);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = `700 28px ${FONT_FAMILY}`;
        ctx.fillText(fitText(ctx, t.name, W - M - 360), M + 56, y + 30);
        ctx.fillStyle = '#94a3b8';
        ctx.font = `800 26px ${FONT_FAMILY}`;
        ctx.textAlign = 'right';
        ctx.fillText(formatEsCompactKg(t.volume), W - M, y + 30);
        y += 60;
      });
    }
  }

  // Pie
  ctx.fillStyle = '#475569';
  ctx.font = `700 26px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText('kookyecatgym.com', W / 2, CARD_H - 48);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

