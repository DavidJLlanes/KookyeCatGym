import { WorkoutLog, Exercise } from '../../types';
import { formatEsCompactKg, formatEsNumber } from '../number';
import { getMuscleColor } from '../../data/exerciseMeta';
import { roundedRect, loadImage, drawCircularImage, fitText, FONT_FAMILY } from '../shareCanvas';
import { ShareVariant, W, M, USER_PHOTO_SRC, usableImageUrl, formatDur, layoutPills, Pill } from './common';

// ─────────────────────────────────────────────────────────────────────────
// TARJETA: RESUMEN DE ENTRENAMIENTO
// ─────────────────────────────────────────────────────────────────────────
export interface WorkoutCardOpts {
  log: WorkoutLog;
  exercises: Exercise[];
  hasRecord: boolean;
  variant?: ShareVariant;
}

export async function renderWorkoutCard(canvas: HTMLCanvasElement, opts: WorkoutCardOpts): Promise<string> {
  const { log, exercises, hasRecord } = opts;
  const variant = opts.variant ?? 'compact';
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const accent = hasRecord ? '#f59e0b' : '#3b82f6';

  // Métricas
  let completedSets = 0;
  let volume = 0;
  log.exercises.forEach((we) => {
    we.sets.forEach((s) => {
      if (s.completed) {
        completedSets += 1;
        volume += s.weight * s.reps;
      }
    });
  });
  const exerciseCount = log.exercises.length;
  const dateLabel = new Date(log.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  // Geometría de la rejilla de stats (igual en ambas versiones)
  const gap = 24;
  const cellW = (W - 2 * M - gap) / 2;
  const cellH = 200;
  const gridTop = hasRecord ? 744 : 728;
  const gridBottom = gridTop + 2 * cellH + gap;

  // Geometría del desglose de ejercicios (versión completa): cada ejercicio en
  // una tarjeta con miniatura circular del ejercicio (con anillo del color del
  // grupo muscular) y las series como chips.
  const THUMB_R = 40; // radio de la miniatura del ejercicio
  const CONTENT_X = M + 24 + THUMB_R * 2 + 22; // deja hueco a la miniatura
  const PILL_H = 50;
  const PILL_GAP = 12;
  const PILL_HPAD = 22;
  const PILL_FONT = `700 26px ${FONT_FAMILY}`;
  const EX_CARD_GAP = 20;
  const pillsMaxW = W - M - CONTENT_X - 28;

  const exBlocks: {
    name: string;
    muscleGroup: string;
    color: string;
    thumbUrl: string | null;
    thumbAnon: boolean;
    pillRows: Pill[][];
    cardH: number;
  }[] = [];
  let exSectionH = 0;
  if (variant === 'full') {
    ctx.font = PILL_FONT; // para medir los chips
    for (const we of log.exercises) {
      const done = we.sets.filter((s) => s.completed);
      if (done.length === 0) continue;
      const ex = exercises.find((e) => e.id === we.exerciseId);
      const mg = ex?.muscleGroup || '';
      const thumbUrl = usableImageUrl(ex);
      const tokens = done.map((s) => (s.weight > 0 ? `${formatEsNumber(s.weight)} kg × ${s.reps}` : `${s.reps} reps`));
      const pillRows = layoutPills(ctx, tokens, pillsMaxW, PILL_HPAD, PILL_GAP);
      const rows = pillRows.length;
      // Alto mínimo suficiente para la miniatura (2*R + márgenes)
      const contentH = 38 + 18 + rows * PILL_H + (rows - 1) * PILL_GAP;
      const cardH = 24 + Math.max(contentH, THUMB_R * 2 - 6) + 24;
      exBlocks.push({
        name: ex?.name || 'Ejercicio',
        muscleGroup: mg,
        color: getMuscleColor(mg),
        thumbUrl,
        thumbAnon: !!thumbUrl && thumbUrl.startsWith('http'),
        pillRows,
        cardH,
      });
    }
    exSectionH = 92 + exBlocks.reduce((h, b) => h + b.cardH + EX_CARD_GAP, 0);
  }

  const taglineH = 96;
  const footerH = 70;
  const CARD_H = variant === 'full' ? gridBottom + 44 + exSectionH + taglineH + footerH : 1350;

  canvas.width = W;
  canvas.height = CARD_H;

  // Fondo
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bg.addColorStop(0, '#0b1220');
  bg.addColorStop(0.55, '#020617');
  bg.addColorStop(1, '#000000');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, CARD_H);
  const glow = ctx.createRadialGradient(W / 2, 300, 40, W / 2, 300, 620);
  glow.addColorStop(0, hasRecord ? 'rgba(245, 158, 11, 0.28)' : 'rgba(59, 130, 246, 0.26)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, CARD_H);

  // Carga marca + foto + (en full) las miniaturas de cada ejercicio, todo en
  // paralelo. thumbImgs queda alineado por índice con exBlocks.
  const [logo, photo, ...thumbImgs] = await Promise.all([
    loadImage('/icon-192.png'),
    loadImage(USER_PHOTO_SRC),
    ...(variant === 'full'
      ? exBlocks.map((b) => (b.thumbUrl ? loadImage(b.thumbUrl, b.thumbAnon) : Promise.resolve(null)))
      : []),
  ]);

  // Cabecera
  if (logo) {
    ctx.save();
    roundedRect(ctx, M, 66, 84, 84, 20);
    ctx.clip();
    ctx.drawImage(logo, M, 66, 84, 84);
    ctx.restore();
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 46px ${FONT_FAMILY}`;
  ctx.fillText('KookyeCatGym', 172, 108);
  ctx.fillStyle = '#60a5fa';
  ctx.font = `700 26px ${FONT_FAMILY}`;
  ctx.fillText('Entrenamiento completado', 172, 146);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = `700 26px ${FONT_FAMILY}`;
  ctx.fillText(dateLabel, W - M, 120);
  ctx.textAlign = 'left';

  // Avatar
  const cx = W / 2;
  const cy = 372;
  const r = 138;
  const pGlow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.5);
  pGlow.addColorStop(0, hasRecord ? 'rgba(245,158,11,0.30)' : 'rgba(59,130,246,0.30)');
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
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.font = `900 120px ${FONT_FAMILY}`;
    ctx.fillText('Z', cx, cy + 44);
    ctx.textAlign = 'left';
  }
  ctx.strokeStyle = accent;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.stroke();

  // Nombre
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 54px ${FONT_FAMILY}`;
  ctx.fillText(fitText(ctx, log.routineName || 'Entrenamiento', W - 160), cx, 604);

  // Insignia de récord
  if (hasRecord) {
    const label = '¡NUEVO RÉCORD!';
    ctx.font = `900 34px ${FONT_FAMILY}`;
    const pillW = ctx.measureText(label).width + 96;
    const pillH = 72;
    const pillX = cx - pillW / 2;
    const pillY = 632;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
    roundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
    ctx.lineWidth = 3;
    roundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = `900 34px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, cx + 18, pillY + 48);
    ctx.beginPath();
    ctx.arc(pillX + 44, pillY + pillH / 2, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
  }

  // Rejilla de stats 2x2
  const stats = [
    { label: 'DURACIÓN', value: formatDur(log.duration) },
    { label: 'EJERCICIOS', value: String(exerciseCount) },
    { label: 'SERIES', value: String(completedSets) },
    { label: 'CARGA TOTAL', value: formatEsCompactKg(volume) },
  ];
  stats.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * (cellW + gap);
    const y = gridTop + row * (cellH + gap);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    roundedRect(ctx, x, y, cellW, cellH, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.85)';
    ctx.lineWidth = 2;
    roundedRect(ctx, x, y, cellW, cellH, 28);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 26px ${FONT_FAMILY}`;
    ctx.fillText(s.label, x + cellW / 2, y + 58);
    ctx.fillStyle = i === 3 ? accent : '#ffffff';
    ctx.font = `900 72px ${FONT_FAMILY}`;
    ctx.fillText(s.value, x + cellW / 2, y + 148);
  });

  // Sección de ejercicios (solo full): tarjeta por ejercicio, barra de color
  // del grupo muscular, etiqueta del grupo y las series como chips.
  if (variant === 'full') {
    const cardW = W - 2 * M;
    let y = gridBottom + 44;
    ctx.textAlign = 'left';
    ctx.fillStyle = accent;
    ctx.font = `900 30px ${FONT_FAMILY}`;
    ctx.fillText('RESUMEN POR EJERCICIO', M, y + 34);
    y += 92;

    exBlocks.forEach((b, bi) => {
      // Tarjeta
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      roundedRect(ctx, M, y, cardW, b.cardH, 26);
      ctx.fill();
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.7)';
      ctx.lineWidth = 2;
      roundedRect(ctx, M, y, cardW, b.cardH, 26);
      ctx.stroke();

      // Miniatura circular del ejercicio con anillo del color del grupo
      // muscular (sustituye a la antigua barra de color).
      const thCx = M + 24 + THUMB_R;
      const thCy = y + b.cardH / 2;
      const thumb = thumbImgs[bi];
      if (thumb) {
        drawCircularImage(ctx, thumb, thCx, thCy, THUMB_R);
      } else {
        // Sin imagen: círculo neutro para que la tarjeta siga siendo intencionada
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(thCx, thCy, THUMB_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = b.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 40px ${FONT_FAMILY}`;
        ctx.fillText(b.name.charAt(0).toUpperCase(), thCx, thCy + 2);
        ctx.textBaseline = 'alphabetic';
      }
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(thCx, thCy, THUMB_R + 3, 0, Math.PI * 2);
      ctx.stroke();

      // Nombre del ejercicio
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 32px ${FONT_FAMILY}`;
      ctx.textAlign = 'left';
      ctx.fillText(fitText(ctx, b.name, cardW - (CONTENT_X - M) - 220), CONTENT_X, y + 54);

      // Etiqueta del grupo muscular (derecha)
      if (b.muscleGroup) {
        ctx.fillStyle = b.color;
        ctx.font = `800 22px ${FONT_FAMILY}`;
        ctx.textAlign = 'right';
        ctx.fillText(b.muscleGroup.toUpperCase(), W - M - 26, y + 51);
      }

      // Chips de series
      let py = y + 80;
      for (const prow of b.pillRows) {
        let px = CONTENT_X;
        for (const pill of prow) {
          ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
          roundedRect(ctx, px, py, pill.w, PILL_H, PILL_H / 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.55)';
          ctx.lineWidth = 1.5;
          roundedRect(ctx, px, py, pill.w, PILL_H, PILL_H / 2);
          ctx.stroke();
          ctx.fillStyle = '#e2e8f0';
          ctx.font = PILL_FONT;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pill.text, px + pill.w / 2, py + PILL_H / 2 + 1);
          ctx.textBaseline = 'alphabetic';
          px += pill.w + PILL_GAP;
        }
        py += PILL_H + PILL_GAP;
      }

      y += b.cardH + EX_CARD_GAP;
    });
  }

  // Frase motivadora
  ctx.textAlign = 'center';
  ctx.fillStyle = '#cbd5e1';
  ctx.font = `800 34px ${FONT_FAMILY}`;
  const tagline = hasRecord ? 'Un paso más hacia tu mejor versión.' : 'La constancia es lo que construye resultados.';
  const taglineY = variant === 'full' ? CARD_H - 110 : Math.min(gridBottom + 74, CARD_H - 96);
  ctx.fillText(tagline, cx, taglineY);

  // Pie
  ctx.fillStyle = '#475569';
  ctx.font = `700 26px ${FONT_FAMILY}`;
  ctx.fillText('kookyecatgym.com', cx, CARD_H - 46);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

// ─────────────────────────────────────────────────────────────────────────
