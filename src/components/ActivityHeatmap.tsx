import React, { useState } from 'react';
import { HeatmapYear, getHeatmapColor, formatVolume } from '../utils/activityHeatmap';

interface ActivityHeatmapProps {
  data: HeatmapYear;
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'];
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Calculate cell size and spacing
  const cellSize = 13;
  const cellSpacing = 2;
  const dayLabelWidth = 30;
  const monthLabelHeight = 20;

  // Prepare months data for labels
  const monthStarts: Array<{ week: number; month: number; label: string }> = [];
  let currentMonth = -1;
  for (let i = 0; i < data.weeks.length; i++) {
    const dayOfWeek = new Date(data.weeks[i].days[0].date).getMonth();
    if (dayOfWeek !== currentMonth) {
      currentMonth = dayOfWeek;
      monthStarts.push({ week: i, month: dayOfWeek, label: MONTH_LABELS[dayOfWeek] });
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2 bg-slate-900 rounded border border-slate-800 text-xs">
          <div className="text-slate-500">Volumen total</div>
          <div className="font-bold text-slate-200">{formatVolume(data.totalVolume)}</div>
        </div>
        <div className="p-2 bg-slate-900 rounded border border-slate-800 text-xs">
          <div className="text-slate-500">Días activos</div>
          <div className="font-bold text-slate-200">{data.activeDays}</div>
        </div>
        <div className="p-2 bg-slate-900 rounded border border-slate-800 text-xs">
          <div className="text-slate-500">Max. diario</div>
          <div className="font-bold text-slate-200">{formatVolume(data.maxDailyVolume)}</div>
        </div>
        <div className="p-2 bg-slate-900 rounded border border-slate-800 text-xs">
          <div className="text-slate-500">Año</div>
          <div className="font-bold text-slate-200">{data.year}</div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-x-auto">
        <svg
          width={dayLabelWidth + data.weeks.length * (cellSize + cellSpacing) + 20}
          height={monthLabelHeight + 7 * (cellSize + cellSpacing) + 40}
          className="min-w-full"
        >
          {/* Day labels */}
          {DAY_LABELS.map((label, i) => (
            <text
              key={`day-${i}`}
              x="5"
              y={monthLabelHeight + i * (cellSize + cellSpacing) + cellSize}
              fontSize="11"
              fill="#94a3b8"
              textAnchor="start"
            >
              {label}
            </text>
          ))}

          {/* Month labels */}
          {monthStarts.map((m, idx) => (
            <text
              key={`month-${idx}`}
              x={dayLabelWidth + m.week * (cellSize + cellSpacing)}
              y={monthLabelHeight - 5}
              fontSize="11"
              fill="#94a3b8"
              textAnchor="start"
            >
              {m.label}
            </text>
          ))}

          {/* Cells */}
          {data.weeks.map((week, weekIdx) => {
            return week.days.map((day, dayIdx) => {
              const x = dayLabelWidth + weekIdx * (cellSize + cellSpacing);
              const y = monthLabelHeight + dayIdx * (cellSize + cellSpacing);
              const color = getHeatmapColor(day.intensity);
              const isHovered = hoveredDay === day.date;

              return (
                <g
                  key={`cell-${day.date}`}
                  onMouseEnter={() => setHoveredDay(day.date)}
                  onMouseLeave={() => setHoveredDay(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    fill={color}
                    stroke="#475569"
                    strokeWidth="1"
                    rx="3"
                    opacity={isHovered ? 1 : 0.8}
                    className="transition-opacity"
                  />
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <>
                      <rect
                        x={x - 60}
                        y={y - 35}
                        width="120"
                        height="30"
                        fill="#1e293b"
                        stroke="#475569"
                        strokeWidth="1"
                        rx="4"
                      />
                      <text x={x - 50} y={y - 18} fontSize="11" fill="#e2e8f0" fontWeight="bold">
                        {new Date(day.date).toLocaleDateString('es-ES')}
                      </text>
                      <text x={x - 50} y={y - 5} fontSize="10" fill="#94a3b8">
                        {day.workoutCount} entrenamientos
                      </text>
                      <text x={x - 50} y={y + 5} fontSize="10" fill="#94a3b8">
                        {formatVolume(day.volume)} volumen
                      </text>
                    </>
                  )}
                </g>
              );
            });
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
        <span>Menos</span>
        <div className="flex gap-1">
          {(['none', 'low', 'medium', 'high', 'very_high'] as const).map((level) => (
            <div
              key={level}
              className="w-3 h-3 rounded-sm border border-slate-600"
              style={{ backgroundColor: getHeatmapColor(level) }}
            />
          ))}
        </div>
        <span>Más</span>
      </div>

      {/* Month Breakdown */}
      <div className="space-y-2">
        <h3 className="font-bold text-slate-200 text-sm">Por mes</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {MONTH_LABELS.map((month, idx) => {
            const monthWeeks = data.weeks.filter((w) => {
              const weekMonth = new Date(w.days[0].date).getMonth();
              return weekMonth === idx;
            });
            const monthVolume = monthWeeks.reduce((sum, w) => sum + w.totalVolume, 0);
            const monthDays = monthWeeks.reduce((sum, w) => sum + w.days.filter((d) => d.workoutCount > 0).length, 0);

            return (
              <div key={idx} className="p-2 bg-slate-900 rounded border border-slate-800 text-xs">
                <div className="text-slate-500">{month}</div>
                <div className="font-bold text-slate-200">{formatVolume(monthVolume)}</div>
                <div className="text-[10px] text-slate-400">{monthDays} días</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
