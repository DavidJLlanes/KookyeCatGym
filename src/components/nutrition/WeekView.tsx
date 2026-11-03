import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { NutritionTargets } from '../../utils/nutrition/energy';
import { averageLogged, lastDays } from '../../utils/nutrition/totals';
import { nutritionToCsv } from '../../utils/nutrition/csv';
import { downloadCsv } from '../../utils/csvExport';
import { localDayKey } from '../../utils/userData';
import StatTile from '../StatTile';
import type { NutritionData } from '../../hooks/useNutritionData';

/** Últimos 7 días: calorías frente al objetivo, medias y exportación. */
export default function WeekView({ data, targets }: { data: NutritionData; targets: NutritionTargets | null }) {
  const today = localDayKey();
  const points = useMemo(() => lastDays(data.log, today, 7), [data.log, today]);
  const avg = averageLogged(points);
  const chart = points.map((p) => ({
    day: new Date(Number(p.date.slice(0, 4)), Number(p.date.slice(5, 7)) - 1, Number(p.date.slice(8, 10))).toLocaleDateString('es-ES', { weekday: 'short' }),
    kcal: p.logged ? p.kcal : 0,
  }));
  const hasAny = Object.keys(data.log).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-black text-white text-base">Últimos 7 días</h2>
        <button
          type="button"
          disabled={!hasAny}
          onClick={() => downloadCsv(`nutricion_${today}.csv`, nutritionToCsv(data.log))}
          className="btn btn-secondary btn-sm disabled:opacity-40"
        >
          <Download /> Exportar CSV
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile id="week-days" icon={Download} label="Días registrados" value={avg.days} sub="de los últimos 7" />
        <StatTile id="week-kcal" icon={Download} label="Calorías (media)" value={avg.days ? avg.kcal : '—'} sub={targets ? `objetivo ${targets.kcal}` : undefined} />
        <StatTile id="week-protein" icon={Download} label="Proteína (media)" value={avg.days ? `${Math.round(avg.protein)} g` : '—'} sub={targets ? `objetivo ${targets.protein} g` : undefined} />
        <StatTile id="week-carbs" icon={Download} label="Hidratos (media)" value={avg.days ? `${Math.round(avg.carbs)} g` : '—'} />
      </div>
      <section className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xl" aria-label="Calorías por día">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12 }} formatter={(v: number) => [`${v} kcal`, 'Calorías']} />
              {targets && <ReferenceLine y={targets.kcal} stroke="#f59e0b" strokeDasharray="4 4" />}
              <Bar dataKey="kcal" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {targets && <p className="text-[11px] text-slate-500 mt-2">La línea naranja es tu objetivo de calorías.</p>}
      </section>
    </div>
  );
}
