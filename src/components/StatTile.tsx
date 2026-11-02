import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: string;
  /** Colores del icono: clases de Tailwind para fondo, texto y borde. */
  tone?: string;
  id?: string;
}

/**
 * Casilla de estadística que no se desborda en ninguna pantalla: el icono y la
 * etiqueta van arriba (la etiqueta puede partirse en dos líneas) y el valor
 * debajo, así el ancho nunca depende de lo larga que sea la etiqueta.
 */
export default function StatTile({ icon: Icon, label, value, sub, tone = 'bg-blue-950/60 text-blue-400 border-blue-500/20', id }: StatTileProps) {
  return (
    <div className="min-w-0 bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-lg">
      <span className={`inline-flex p-1.5 rounded-lg border ${tone}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div lang="es" className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight hyphens-auto">{label}</div>
      <div id={id} className="mt-0.5 text-xl font-black text-white leading-tight tabular-nums">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] font-bold text-slate-500 leading-tight">{sub}</div>}
    </div>
  );
}
