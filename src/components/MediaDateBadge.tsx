import React from 'react';

// Fecha de subida de una foto/vídeo como un mini calendario: franja azul con el
// mes y el día grande debajo. Va en la esquina superior izquierda de la miniatura.

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

// Las fechas llegan de SQLite en UTC sin zona ("2026-10-07 16:20:40"), o como
// día suelto ("2026-10-07", fecha de la foto), que se toma en hora local
function parseDate(value: string): Date | null {
  const day = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function MediaDateBadge({ date, label = 'Subida el' }: { date: string; label?: string }) {
  const d = parseDate(date);
  if (!d) return null;

  const otherYear = d.getFullYear() !== new Date().getFullYear();
  const isDay = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const full = d.toLocaleString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    ...(isDay ? {} : { hour: '2-digit', minute: '2-digit' }),
  });

  return (
    <div
      title={`${label} ${full}`}
      className="absolute top-1.5 left-1.5 min-w-[2.25rem] rounded-lg overflow-hidden text-center shadow-lg shadow-black/40 border border-white/10 pointer-events-auto select-none"
    >
      <div className="bg-blue-600 px-1.5 py-[1px] text-[8px] font-black tracking-wider text-white leading-tight">
        {MONTHS[d.getMonth()]}
        {otherYear && ` ${String(d.getFullYear()).slice(-2)}`}
      </div>
      <div className="bg-slate-950/85 backdrop-blur-sm px-1.5 pb-0.5 text-sm font-black text-white leading-tight">
        {d.getDate()}
      </div>
    </div>
  );
}
