import React, { useState, useMemo} from 'react';
import { BarChart2, Award} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { WorkoutLog, Exercise } from '../../types';
import { formatEsNumber} from '../../utils/number';
import { isHold } from '../../utils/holdSets';


interface ExerciseProgressCardProps {
  logs: WorkoutLog[];
  exercises: Exercise[];
  selectedExId: string;
  setSelectedExId: (id: string) => void;
  completedExerciseIds: string[];
}

export default function ExerciseProgressCard({ logs, exercises, selectedExId, setSelectedExId, completedExerciseIds }: ExerciseProgressCardProps) {
  const [metricType, setMetricType] = useState<'volume' | 'max_weight' | 'total_reps' | 'one_rep_max'>('volume');
  // Extract progression data for the selected exercise
  const exerciseProgressionData = useMemo(() => {
    // Sort logs chronologically
    const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const data: any[] = [];
    // Ejercicio por tiempo: la serie guarda segundos, así que no hay volumen ni 1RM
    const holdEx = isHold(exercises.find((e) => e.id === selectedExId));
    
    sortedLogs.forEach((log) => {
      // Find matches for the selected exercise in this workout log
      const matchedExs = log.exercises.filter((we) => we.exerciseId === selectedExId);
      
      if (matchedExs.length > 0) {
        let totalVolume = 0;
        let maxWeight = 0;
        let totalReps = 0;
        let best1RM = 0;

        matchedExs.forEach((we) => {
          we.sets.forEach((set) => {
            if (set.completed) {
              const vol = holdEx ? 0 : set.weight * set.reps;
              totalVolume += vol;
              totalReps += set.reps;
              if (set.weight > maxWeight) {
                maxWeight = set.weight;
              }
              // Epley: 1RM = w * (1 + r / 30)
              const oneRM = holdEx ? 0 : set.weight * (1 + set.reps / 30);
              if (oneRM > best1RM) {
                best1RM = oneRM;
              }
            }
          });
        });

        if (totalVolume > 0 || (holdEx && totalReps > 0)) {
          const dateObj = new Date(log.date);
          const formattedDate = dateObj.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
          
          data.push({
            date: formattedDate,
            rawDate: log.date,
            volume: Math.round(totalVolume * 10) / 10,
            max_weight: maxWeight,
            total_reps: totalReps,
            one_rep_max: Math.round(best1RM * 10) / 10,
          });
        }
      }
    });

    return data;
  }, [logs, selectedExId, exercises]);


  const selectedExerciseObject = exercises.find((e) => e.id === selectedExId);

  // Un ejercicio por tiempo solo tiene sentido con "mejor peso" y tiempo total
  const holdSelected = isHold(selectedExerciseObject);
  const metric: typeof metricType = holdSelected && (metricType === 'volume' || metricType === 'one_rep_max') ? 'total_reps' : metricType;
  const metricTabs = (holdSelected ? ['max_weight', 'total_reps'] : ['volume', 'max_weight', 'total_reps', 'one_rep_max']) as (typeof metricType)[];

  const getMetricLabel = (m: typeof metricType) => {
    switch (m) {
      case 'volume': return 'Volumen Total (kg)';
      case 'max_weight': return 'Peso Máximo (kg)';
      case 'total_reps': return holdSelected ? 'Tiempo total (s)' : 'Repeticiones Totales';
      case 'one_rep_max': return '1RM Estimado (kg)';
    }
  };


  return (
      <div className="lg:col-span-2 bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-blue-400" />
              Análisis de Progresión
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Visualiza volumen, pesos máximos y One-Rep Max de cualquier ejercicio.
            </p>
          </div>

          {/* Exercise Selector dropdown */}
          <div className="relative">
            <select
              id="select-analytics-exercise"
              value={selectedExId}
              onChange={(e) => setSelectedExId(e.target.value)}
              className="w-full sm:w-56 px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
            >
              {completedExerciseIds.length > 0 ? (
                completedExerciseIds.map((id) => {
                  const ex = exercises.find((e) => e.id === id);
                  return (
                    <option key={id} value={id} className="bg-slate-950 text-slate-100">
                      {ex ? ex.name : 'Ejercicio'}
                    </option>
                  );
                })
              ) : (
                exercises.map((ex) => (
                  <option key={ex.id} value={ex.id} className="bg-slate-950 text-slate-100">
                    {ex.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Metric selector tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 border border-slate-850 rounded-xl">
          {metricTabs.map((m) => (
            <button
              key={m}
              onClick={() => setMetricType(m)}
              className={`flex-1 min-w-[80px] text-center py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                metric === m
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-250 hover:bg-slate-900/60'
              }`}
            >
              {m === 'volume' && 'Volumen'}
              {m === 'max_weight' && 'Mejor Peso'}
              {m === 'total_reps' && (holdSelected ? 'Tiempo total' : 'Reps Totales')}
              {m === 'one_rep_max' && '1RM'}
            </button>
          ))}
        </div>

        {/* Line Chart */}
        <div className="h-60 w-full pt-4">
          {exerciseProgressionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={exerciseProgressionData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  name={getMetricLabel(metric)}
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorMetric)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <Award className="h-8 w-8 text-slate-650" />
              <p className="text-slate-400 text-xs font-semibold">No hay registros completados para este ejercicio.</p>
              <p className="text-slate-500 text-[10px]">¡Inicia una rutina o un entrenamiento libre para generar volumen de datos!</p>
            </div>
          )}
        </div>

        {/* Quick stats on the selected exercise progression */}
        {exerciseProgressionData.length > 0 && (
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-center">
            <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block truncate">Volumen Histórico Max</span>
              <span className="font-extrabold text-slate-200 text-sm block truncate">
                {formatEsNumber(Math.max(...exerciseProgressionData.map((d) => d.volume)))} kg
              </span>
            </div>
            <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block truncate">Mejor Peso</span>
              <span className="font-extrabold text-slate-200 text-sm block truncate">
                {formatEsNumber(Math.max(...exerciseProgressionData.map((d) => d.max_weight)))} kg
              </span>
            </div>
            <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block truncate">Max 1RM Estimado</span>
              <span className="font-extrabold text-blue-400 text-sm block truncate">
                {formatEsNumber(Math.max(...exerciseProgressionData.map((d) => d.one_rep_max)))} kg
              </span>
            </div>
          </div>
        )}
      </div>
  );
}
