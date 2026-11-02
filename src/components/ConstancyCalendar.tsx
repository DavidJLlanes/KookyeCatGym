import ScrollRow from './ScrollRow';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import { WorkoutLog } from '../types';

interface ConstancyCalendarProps {
  logs: WorkoutLog[];
}

const WEEKS_IN_CALENDAR = 26;
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
// Nivel 0 (sin entrenar) usa un gris más claro que el fondo de la propia
// tarjeta (slate-900) para que los días vacíos sean visibles como parte de
// la cuadrícula, no invisibles contra el fondo.
const LEVEL_COLORS = ['#1e293b', '#1e3a8a', '#1d4ed8', '#3b82f6', '#60a5fa'];

interface CalendarDay {
  date: Date;
  count: number;
  isFuture: boolean;
  isToday: boolean;
}

function calendarLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 5) return 1;
  if (count <= 10) return 2;
  if (count <= 18) return 3;
  return 4;
}

export default function ConstancyCalendar({ logs }: ConstancyCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startScroll: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Un cuadro por día de las últimas 26 semanas (~6 meses), agrupado en
  // columnas semanales (Lunes-Domingo) como un "heatmap" de contribuciones.
  // La intensidad depende de cuántas series completadas hubo ese día.
  const weeks = useMemo<CalendarDay[][]>(() => {
    const setsByDay: Record<string, number> = {};
    logs.forEach((log) => {
      const key = new Date(log.date).toDateString();
      const setsInLog = log.exercises.reduce((a, we) => a + we.sets.filter((s) => s.completed).length, 0);
      setsByDay[key] = (setsByDay[key] || 0) + setsInLog;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Retrocede hasta el lunes de la semana actual, y luego WEEKS_IN_CALENDAR-1 semanas más atrás
    const dayOfWeek = today.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentWeekMonday = new Date(today);
    currentWeekMonday.setDate(currentWeekMonday.getDate() - daysSinceMonday);
    const firstMonday = new Date(currentWeekMonday);
    firstMonday.setDate(firstMonday.getDate() - (WEEKS_IN_CALENDAR - 1) * 7);

    const result: CalendarDay[][] = [];
    for (let w = 0; w < WEEKS_IN_CALENDAR; w++) {
      const week: CalendarDay[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(firstMonday);
        day.setDate(day.getDate() + w * 7 + d);
        week.push({
          date: day,
          count: setsByDay[day.toDateString()] || 0,
          isFuture: day.getTime() > today.getTime(),
          isToday: day.getTime() === today.getTime(),
        });
      }
      result.push(week);
    }
    return result;
  }, [logs]);

  // Etiqueta de mes: se muestra solo sobre la primera columna de cada mes
  // nuevo (igual que el heatmap de contribuciones de GitHub), no en todas
  // las columnas -- así no se amontonan las etiquetas.
  const monthLabels = useMemo(() => {
    return weeks.map((week, wi) => {
      const month = week[0].date.getMonth();
      const prevMonth = wi > 0 ? weeks[wi - 1][0].date.getMonth() : null;
      if (wi === 0 || month !== prevMonth) {
        return week[0].date.toLocaleDateString('es-ES', { month: 'short' });
      }
      return null;
    });
  }, [weeks]);

  // Al abrir la pestaña, desplaza hasta el final (semana actual): con
  // celdas más grandes 26 semanas no caben en pantalla, y lo relevante por
  // defecto es lo reciente, no el pasado lejano. Solo al montar -- si se
  // repitiera en cada cambio de `logs` le quitaría al usuario el scroll
  // manual que ya hizo hacia atrás.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDragStart = (clientX: number) => {
    if (!scrollRef.current) return;
    dragState.current = { startX: clientX, startScroll: scrollRef.current.scrollLeft };
    setDragging(true);
  };
  const onDragMove = (clientX: number) => {
    if (!dragState.current || !scrollRef.current) return;
    scrollRef.current.scrollLeft = dragState.current.startScroll - (clientX - dragState.current.startX);
  };
  const onDragEnd = () => {
    dragState.current = null;
    setDragging(false);
  };

  return (
    <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
      <div>
        <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-400" />
          Calendario de Constancia
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Últimas {WEEKS_IN_CALENDAR} semanas. Cada cuadro es un día; cuanto más series completaste, más intenso el color.
        </p>
      </div>

      <div className="flex gap-2">
        {/* Días de la semana: columna fija, nunca se desplaza */}
        <div className="flex flex-col gap-1 shrink-0 pt-6">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="h-5 w-5 flex items-center justify-center text-[10px] font-bold text-slate-500"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Meses + días: área deslizante horizontalmente (arrastre con ratón o dedo) */}
        <ScrollRow
          className="flex-1 min-w-0"
          fadeFrom="from-slate-900"
          scrollerRef={scrollRef}
          scrollerClassName={`select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          scrollerProps={{
            id: 'constancy-calendar',
            onMouseDown: (e) => onDragStart(e.pageX),
            onMouseMove: (e) => {
              if (!dragState.current) return;
              e.preventDefault();
              onDragMove(e.pageX);
            },
            onMouseUp: onDragEnd,
            onMouseLeave: onDragEnd,
          }}
        >
            <div className="inline-flex flex-col gap-1 px-1">
              {/* Fila de meses */}
              <div className="flex gap-1">
                {weeks.map((_, wi) => (
                  <div key={wi} className="w-5 shrink-0 text-[10px] font-bold text-slate-400 capitalize">
                    {monthLabels[wi] ?? ''}
                  </div>
                ))}
              </div>

              {/* Cuadrícula de días */}
              <div className="flex gap-1">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        title={`${day.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}: ${day.count} series`}
                        className={`h-5 w-5 rounded-md ${
                          day.isToday ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-900' : ''
                        }`}
                        style={{
                          backgroundColor: day.isFuture ? 'transparent' : LEVEL_COLORS[calendarLevel(day.count)],
                          border: day.isFuture ? '1px solid #1e293b' : 'none',
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
        </ScrollRow>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
        <span>Menos</span>
        {LEVEL_COLORS.map((c, i) => (
          <span key={i} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span>Más</span>
      </div>
    </div>
  );
}
