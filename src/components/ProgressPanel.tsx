import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, BarChart2, Award, Calculator, Target, Dumbbell, Calendar, ChevronDown, Flame, Percent, Clock, Timer, Trophy, ListOrdered, ArrowUp, ArrowDown, Share2, Map, Sparkles, Images } from 'lucide-react';
import BodyProgressSection, { BodyProgressSectionProps } from './BodyProgressSection';
import type { MediaItem } from '../api/client';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, Legend } from 'recharts';
import { WorkoutLog, Exercise } from '../types';
import { MUSCLE_GROUPS, getMuscleColor } from '../data/exerciseMeta';
import DecimalInput from './DecimalInput';
import { formatEsNumber, formatEsCompactKg } from '../utils/number';
import { computeAllTimeRecords, computeSessionRecords, PrEvent } from '../utils/records';
import { calculateMuscleStats, calculateBodyLoad } from '../utils/muscleStats';
import { get1RMHistory } from '../utils/oneRMEstimate';
import { generateYearHeatmap } from '../utils/activityHeatmap';
import { ProgressionRule, prefillWithProgression } from '../utils/progressionRules';
import { getLastPerformanceSets } from '../utils/lastPerformance';
import { calculateAllBalances as calculateMuscleBalances } from '../utils/muscleBalance';
import ShareCardModal from './ShareCardModal';
import ConstancyCalendar from './ConstancyCalendar';
import MuscleMapVisual from './MuscleMapVisual';
import OneRMChart from './OneRMChart';
import ActivityHeatmap from './ActivityHeatmap';
import ProgressionRulesPanel from './ProgressionRulesPanel';
import MuscleBalanceReport from './MuscleBalanceReport';
import AICoachPanel from './AICoachPanel';

interface ProgressPanelProps {
  logs: WorkoutLog[];
  exercises: Exercise[];
  progressionRules: ProgressionRule[];
  onSaveProgressionRule: (rule: ProgressionRule) => Promise<void>;
  onDeleteProgressionRule: (exerciseId: string) => Promise<void>;
  // Fotos de progreso físico (apartado "Físico")
  progressPhotos?: MediaItem[];
  onUploadProgressPhoto?: BodyProgressSectionProps['onUpload'];
  onUpdatePhoto?: BodyProgressSectionProps['onUpdate'];
  onDeletePhoto?: (id: string) => Promise<void>;
}

export default function ProgressPanel({
  logs,
  exercises,
  progressionRules,
  onSaveProgressionRule,
  onDeleteProgressionRule,
  progressPhotos = [],
  onUploadProgressPhoto,
  onUpdatePhoto,
  onDeletePhoto,
}: ProgressPanelProps) {
  // Muscle focus: calculates completed sets per muscle group
  const muscleFocusData = useMemo(() => {
    const focus: Record<string, number> = {
      Pecho: 0,
      Espalda: 0,
      Piernas: 0,
      Hombros: 0,
      Brazos: 0,
      Abdomen: 0,
    };

    logs.forEach((log) => {
      log.exercises.forEach((we) => {
        const ex = exercises.find((e) => e.id === we.exerciseId);
        if (ex) {
          const completedSetsCount = we.sets.filter((s) => s.completed).length;
          focus[ex.muscleGroup] += completedSetsCount;
        }
      });
    });

    return Object.entries(focus).map(([name, value]) => ({
      name,
      value,
      color: getMuscleColor(name),
    }));
  }, [logs, exercises]);

  // Exercise selector for progression chart
  const completedExerciseIds = useMemo(() => {
    const ids = new Set<string>();
    logs.forEach((log) => {
      log.exercises.forEach((we) => {
        ids.add(we.exerciseId);
      });
    });
    return Array.from(ids);
  }, [logs]);

  const [selectedExId, setSelectedExId] = useState<string>('');
  const [metricType, setMetricType] = useState<'volume' | 'max_weight' | 'total_reps' | 'one_rep_max'>('volume');
  const [selectedMuscle, setSelectedMuscle] = useState<string | undefined>();
  const [progressTab, setProgressTab] = useState<'overview' | 'muscle' | 'physique' | 'oneRM' | 'heatmap' | 'progression' | 'balance' | 'coach'>('overview');

  // Muscle Map Stats
  const [musclePeriod, setMusclePeriod] = useState<number | null>(30);
  const muscleStats = useMemo(() => calculateMuscleStats(logs, exercises, musclePeriod), [logs, exercises, musclePeriod]);
  const bodyLoad = useMemo(() => calculateBodyLoad(logs, exercises, musclePeriod), [logs, exercises, musclePeriod]);
  const lastLogDate = useMemo(
    () => logs.reduce<string | null>((latest, l) => (!latest || new Date(l.date) > new Date(latest) ? l.date : latest), null),
    [logs]
  );

  // Regla de progresión del ejercicio seleccionado y vista previa de la próxima sesión
  const selectedRule = useMemo(
    () => progressionRules.find((r) => r.exerciseId === selectedExId),
    [progressionRules, selectedExId]
  );
  const selectedLastSets = useMemo(() => getLastPerformanceSets(selectedExId, logs), [selectedExId, logs]);
  const selectedNextSets = useMemo(
    () => (selectedLastSets ? prefillWithProgression(selectedLastSets, selectedLastSets, selectedRule) : null),
    [selectedLastSets, selectedRule]
  );

  // Muscle Balance Ratios
  const muscleBalances = useMemo(() => calculateMuscleBalances(logs, exercises), [logs, exercises]);

  // 1RM History for selected exercise
  const selectedExercise1RM = useMemo(() => {
    if (!selectedExId) return null;
    return get1RMHistory(selectedExId, logs, exercises);
  }, [selectedExId, logs, exercises]);

  // Activity Heatmap for current year
  const currentYear = new Date().getFullYear();
  const yearHeatmap = useMemo(() => generateYearHeatmap(currentYear, logs), [logs, currentYear]);

  // Selecciona automáticamente un ejercicio válido cuando cargan los datos
  // (evita quedarse en un ID inexistente y mostrar el gráfico vacío al entrar).
  useEffect(() => {
    const valid = completedExerciseIds.length > 0 ? completedExerciseIds : exercises.map((e) => e.id);
    if (valid.length > 0 && !valid.includes(selectedExId)) {
      setSelectedExId(valid[0]);
    }
  }, [completedExerciseIds, exercises, selectedExId]);

  // Interactive 1RM Calculator state
  const [calcWeight, setCalcWeight] = useState<number>(80);
  const [calcReps, setCalcReps] = useState<number>(8);

  const calculated1RM = useMemo(() => {
    if (calcWeight <= 0 || calcReps <= 0) return 0;
    // Epley formula: 1RM = w * (1 + r / 30)
    return Math.round(calcWeight * (1 + calcReps / 30) * 10) / 10;
  }, [calcWeight, calcReps]);

  const percentageTable = useMemo(() => {
    const table = [];
    const base = calculated1RM;
    for (let pct = 100; pct >= 50; pct -= 5) {
      // Approximate reps based on percentage of 1RM (standard guidelines)
      let approxReps = 1;
      if (pct === 95) approxReps = 2;
      else if (pct === 90) approxReps = 4;
      else if (pct === 85) approxReps = 6;
      else if (pct === 80) approxReps = 8;
      else if (pct === 75) approxReps = 10;
      else if (pct === 70) approxReps = 12;
      else if (pct === 65) approxReps = 15;
      else if (pct === 60) approxReps = 20;
      else if (pct < 60) approxReps = 25;

      table.push({
        percentage: pct,
        weight: Math.round(base * (pct / 100) * 10) / 10,
        reps: approxReps,
      });
    }
    return table;
  }, [calculated1RM]);

  // Extract progression data for the selected exercise
  const exerciseProgressionData = useMemo(() => {
    // Sort logs chronologically
    const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const data: any[] = [];
    
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
              const vol = set.weight * set.reps;
              totalVolume += vol;
              totalReps += set.reps;
              if (set.weight > maxWeight) {
                maxWeight = set.weight;
              }
              // Epley: 1RM = w * (1 + r / 30)
              const oneRM = set.weight * (1 + set.reps / 30);
              if (oneRM > best1RM) {
                best1RM = oneRM;
              }
            }
          });
        });

        if (totalVolume > 0) {
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
  }, [logs, selectedExId]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalWorkouts = logs.length;
    let totalSetsLogged = 0;
    let totalKgLifted = 0;

    logs.forEach((log) => {
      log.exercises.forEach((we) => {
        we.sets.forEach((set) => {
          if (set.completed) {
            totalSetsLogged++;
            totalKgLifted += set.weight * set.reps;
          }
        });
      });
    });

    // Racha real: días consecutivos entrenados contando hacia atrás desde hoy
    // (o desde ayer, si aún no has entrenado hoy).
    let currentStreak = 0;
    let longestStreak = 0;
    if (logs.length > 0) {
      const daySet = new Set(logs.map((log) => new Date(log.date).toDateString()));
      const cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      // Si no has entrenado hoy, la racha puede seguir viva desde ayer
      if (!daySet.has(cursor.toDateString())) {
        cursor.setDate(cursor.getDate() - 1);
      }
      while (daySet.has(cursor.toDateString())) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      }

      // Récord histórico: se recorren todos los días únicos entrenados (ordenados)
      // y se mide la racha más larga de días consecutivos en cualquier punto.
      // Importante: se compara avanzando la fecha de calendario (setDate+1),
      // no restando milisegundos exactos — en los dos días de cambio de
      // hora, dos medianoches locales consecutivas están a 23h o 25h de
      // distancia, nunca a 24h exactas, así que una comparación por ms
      // rompería la racha justo ahí aunque sí se entrenara todos los días.
      const uniqueDays = Array.from(daySet)
        .map((d) => new Date(d))
        .sort((a, b) => a.getTime() - b.getTime());
      let running = 0;
      let prevDate: Date | null = null;
      for (const current of uniqueDays) {
        if (prevDate !== null) {
          const nextExpected = new Date(prevDate);
          nextExpected.setDate(nextExpected.getDate() + 1);
          running = nextExpected.toDateString() === current.toDateString() ? running + 1 : 1;
        } else {
          running = 1;
        }
        if (running > longestStreak) longestStreak = running;
        prevDate = current;
      }
    }

    return {
      totalWorkouts,
      totalSetsLogged,
      totalKgLifted: Math.round(totalKgLifted),
      streak: currentStreak,
      longestStreak,
    };
  }, [logs]);

  // Tiempo entrenado: total histórico, parcial de hoy y parcial de esta semana (Lunes-Domingo)
  const timeStats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(todayStart);
    const dayOfWeek = weekStart.getDay(); // 0=Domingo, 1=Lunes, ... 6=Sábado
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - daysSinceMonday);

    let totalSeconds = 0;
    let todaySeconds = 0;
    let weekSeconds = 0;

    logs.forEach((log) => {
      const logDate = new Date(log.date);
      totalSeconds += log.duration;
      if (logDate >= weekStart) weekSeconds += log.duration;
      if (logDate >= todayStart) todaySeconds += log.duration;
    });

    return { totalSeconds, todaySeconds, weekSeconds };
  }, [logs]);

  // Comparativa interanual: mes en curso vs el mismo mes del año pasado
  // (solo tiene sentido enseñarla si hay datos de hace un año o más).
  const yearOverYear = useMemo(() => {
    const now = new Date();
    const sumFor = (year: number, month: number) => {
      let volume = 0;
      let workouts = 0;
      let sets = 0;
      logs.forEach((log) => {
        const d = new Date(log.date);
        if (d.getFullYear() === year && d.getMonth() === month) {
          workouts++;
          log.exercises.forEach((we) => {
            we.sets.forEach((s) => {
              if (s.completed) {
                volume += s.weight * s.reps;
                sets++;
              }
            });
          });
        }
      });
      return { volume: Math.round(volume), workouts, sets };
    };

    const current = sumFor(now.getFullYear(), now.getMonth());
    const previous = sumFor(now.getFullYear() - 1, now.getMonth());
    const monthName = now.toLocaleDateString('es-ES', { month: 'long' });

    return { current, previous, monthName, hasPreviousData: previous.workouts > 0 };
  }, [logs]);

  const pctChange = (curr: number, prev: number): number | null => {
    if (prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // Ranking de ejercicios más entrenados (por volumen total levantado)
  const exerciseRanking = useMemo(() => {
    const byExercise: Record<string, { volume: number; sets: number }> = {};
    logs.forEach((log) => {
      log.exercises.forEach((we) => {
        const completed = we.sets.filter((s) => s.completed);
        if (completed.length === 0) return;
        if (!byExercise[we.exerciseId]) byExercise[we.exerciseId] = { volume: 0, sets: 0 };
        completed.forEach((s) => {
          byExercise[we.exerciseId].volume += s.weight * s.reps;
          byExercise[we.exerciseId].sets += 1;
        });
      });
    });

    return Object.entries(byExercise)
      .map(([exerciseId, data]) => {
        const ex = exercises.find((e) => e.id === exerciseId);
        return { exerciseId, name: ex?.name || 'Ejercicio', muscleGroup: ex?.muscleGroup || '', ...data };
      })
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);
  }, [logs, exercises]);

  // Días desde la última vez que se entrenó cada grupo muscular.
  // Se comparan medianoches locales (no instantes exactos): dos "días" con
  // <24h reales entre ellos (ej. entrenar a las 23:50 y luego a las 00:10)
  // deben contar como "ayer", no como "hace 0 días" por redondeo hacia
  // abajo del tiempo transcurrido. Además, restar medianoches en vez de
  // timestamps crudos evita el mismo problema de cambio de hora (DST) que
  // afecta a longestStreak.
  const daysSinceByMuscle = useMemo(() => {
    const toMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const lastDateByGroup: Record<string, number> = {};
    logs.forEach((log) => {
      const midnight = toMidnight(new Date(log.date));
      log.exercises.forEach((we) => {
        const hasCompleted = we.sets.some((s) => s.completed);
        if (!hasCompleted) return;
        const ex = exercises.find((e) => e.id === we.exerciseId);
        if (!ex) return;
        if (!lastDateByGroup[ex.muscleGroup] || midnight > lastDateByGroup[ex.muscleGroup]) {
          lastDateByGroup[ex.muscleGroup] = midnight;
        }
      });
    });

    const todayMidnight = toMidnight(new Date());
    return MUSCLE_GROUPS.map((group) => {
      const lastTime = lastDateByGroup[group];
      const days = lastTime ? Math.round((todayMidnight - lastTime) / (24 * 60 * 60 * 1000)) : null;
      return { group, days };
    });
  }, [logs, exercises]);

  // Feed cronológico de récords históricos (peso y repeticiones)
  const prEvents = useMemo(() => computeAllTimeRecords(logs, exercises), [logs, exercises]);
  const [showAllPrs, setShowAllPrs] = useState(false);
  const visiblePrEvents = showAllPrs ? prEvents : prEvents.slice(0, 8);

  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Último entrenamiento finalizado + si batió algún récord (para poder
  // compartir también su resumen desde el modal de "Compartir").
  const lastWorkoutShare = useMemo(() => {
    if (logs.length === 0) return null;
    const sorted = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const last = sorted[0];
    const previous = sorted.slice(1);
    const summary = computeSessionRecords(last.exercises, previous, exercises);
    const hasRecord =
      Object.keys(summary.weightRecords).length > 0 || Object.keys(summary.repRecords).length > 0;
    return { last, hasRecord };
  }, [logs, exercises]);

  const formatDuration = (totalSeconds: number) => {
    const totalMinutes = Math.round(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} min`;
  };

  const selectedExerciseObject = exercises.find((e) => e.id === selectedExId);

  const getMetricLabel = (m: typeof metricType) => {
    switch (m) {
      case 'volume': return 'Volumen Total (kg)';
      case 'max_weight': return 'Peso Máximo (kg)';
      case 'total_reps': return 'Repeticiones Totales';
      case 'one_rep_max': return '1RM Estimado (kg)';
    }
  };

  return (
    <div id="progress-panel" className="space-y-6 text-slate-200">
      {/* 0. Header con acceso a la tarjeta compartible */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-black text-white text-lg tracking-tight">Tu Progreso</h2>
        <button
          id="btn-open-share-card"
          type="button"
          onClick={() => setShareModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-950/20 cursor-pointer shrink-0"
        >
          <Share2 className="h-3.5 w-3.5" />
          Compartir
        </button>
      </div>

      {/* 0.5. Progress View Tabs */}
      <div className="flex gap-2 border-b border-slate-800 overflow-x-auto">
        {[
          { id: 'overview', label: 'Resumen', icon: TrendingUp },
          { id: 'muscle', label: 'Músculos', icon: Map },
          ...(onUploadProgressPhoto ? [{ id: 'physique', label: 'Físico', icon: Images }] : []),
          { id: 'oneRM', label: '1RM', icon: Trophy },
          { id: 'heatmap', label: 'Actividad', icon: Calendar },
          { id: 'progression', label: 'Progresión', icon: ArrowUp },
          { id: 'balance', label: 'Balance', icon: Target },
          { id: 'coach', label: 'Coach IA', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = progressTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setProgressTab(tab.id as any)}
              className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap ${
                isActive
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content based on selected tab */}
      {progressTab === 'muscle' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {([[7, '7 días'], [30, '30 días'], [90, '3 meses'], [null, 'Todo']] as [number | null, string][]).map(([days, label]) => (
              <button
                key={label}
                onClick={() => setMusclePeriod(days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  musclePeriod === days ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {Object.keys(bodyLoad).length === 0 && (
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-400">
              No hay series registradas en este periodo.
              {lastLogDate && <> Tu último entrenamiento fue el {new Date(lastLogDate).toLocaleDateString('es-ES')}; prueba con un periodo más largo.</>}
            </div>
          )}
          <MuscleMapVisual
            stats={muscleStats}
            load={bodyLoad}
            selectedMuscle={selectedMuscle}
            onMuscleClick={setSelectedMuscle}
          />
        </motion.div>
      )}

      {progressTab === 'physique' && onUploadProgressPhoto && onUpdatePhoto && onDeletePhoto && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <BodyProgressSection
            photos={progressPhotos}
            onUpload={onUploadProgressPhoto}
            onUpdate={onUpdatePhoto}
            onDelete={onDeletePhoto}
          />
        </motion.div>
      )}

      {progressTab === 'oneRM' && selectedExercise1RM && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
            <label className="block text-xs font-bold text-slate-400 mb-2">Selecciona ejercicio</label>
            <select
              value={selectedExId}
              onChange={(e) => setSelectedExId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm"
            >
              {completedExerciseIds.map((exId) => {
                const ex = exercises.find((e) => e.id === exId);
                return (
                  <option key={exId} value={exId}>
                    {ex?.name}
                  </option>
                );
              })}
            </select>
          </div>
          <OneRMChart data={selectedExercise1RM} />
        </motion.div>
      )}

      {progressTab === 'heatmap' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <ActivityHeatmap data={yearHeatmap} />
        </motion.div>
      )}

      {progressTab === 'progression' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
            <label className="block text-xs font-bold text-slate-400 mb-2">Selecciona ejercicio</label>
            <select
              value={selectedExId}
              onChange={(e) => setSelectedExId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm"
            >
              {completedExerciseIds.map((exId) => {
                const ex = exercises.find((e) => e.id === exId);
                return (
                  <option key={exId} value={exId}>
                    {ex?.name}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedExId && (
            <ProgressionRulesPanel
              key={selectedExId}
              exerciseId={selectedExId}
              exerciseName={exercises.find((e) => e.id === selectedExId)?.name || ''}
              rule={selectedRule}
              lastSets={selectedLastSets}
              nextSets={selectedNextSets}
              onSave={onSaveProgressionRule}
              onDelete={onDeleteProgressionRule}
            />
          )}

          <div className="p-4 bg-blue-950/20 rounded-lg border border-blue-500/30 text-xs text-blue-300 space-y-2">
            <strong>💡 Tipos de Progresión:</strong>
            <ul className="space-y-1 list-disc list-inside text-blue-400">
              <li><strong>Lineal:</strong> Suma peso cada sesión (+2.5kg)</li>
              <li><strong>Greyskull LP:</strong> Aumenta reps primero, luego peso</li>
              <li><strong>Doble Progresión:</strong> Aumenta reps hasta objetivo, luego peso</li>
            </ul>
          </div>
        </motion.div>
      )}

      {progressTab === 'coach' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AICoachPanel logs={logs} exercises={exercises} progressionRules={progressionRules} />
        </motion.div>
      )}

      {progressTab === 'balance' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <MuscleBalanceReport
            balances={muscleBalances}
            isEmpty={muscleBalances.length === 0}
          />
        </motion.div>
      )}

      {progressTab === 'overview' && (
        <>
          {/* 1. Quick Stats Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-3">
          <div className="p-3 bg-blue-950/60 text-blue-400 rounded-xl border border-blue-500/20">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entrenamientos</div>
            <div id="stat-total-workouts" className="text-xl font-black text-white">{stats.totalWorkouts}</div>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-3">
          <div className="p-3 bg-amber-950/50 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
            <Flame className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Racha Activa</div>
            <div id="stat-streak" className="text-xl font-black text-white truncate">{stats.streak} días</div>
            <div className="text-[10px] font-bold text-slate-500 truncate">récord: {stats.longestStreak} días</div>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-3">
          <div className="p-3 bg-blue-950/60 text-blue-400 rounded-xl border border-blue-500/20">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Series Completadas</div>
            <div id="stat-total-sets" className="text-xl font-black text-white">{stats.totalSetsLogged}</div>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-3">
          <div className="p-3 bg-emerald-950/50 text-emerald-400 rounded-xl border border-emerald-500/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Carga Acumulada</div>
            <div id="stat-total-weight" className="text-sm font-black text-white truncate">{formatEsCompactKg(stats.totalKgLifted)}</div>
          </div>
        </div>
      </div>

      {/* 1.5. Time Stats: Total / Semana / Hoy */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-3">
          <div className="p-3 bg-indigo-950/50 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Timer className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tiempo Total Entrenado</div>
            <div id="stat-time-total" className="text-xl font-black text-white">{formatDuration(timeStats.totalSeconds)}</div>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-3">
          <div className="p-3 bg-blue-950/60 text-blue-400 rounded-xl border border-blue-500/20">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Esta Semana (Lun-Dom)</div>
            <div id="stat-time-week" className="text-xl font-black text-white">{formatDuration(timeStats.weekSeconds)}</div>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-3">
          <div className="p-3 bg-emerald-950/50 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hoy</div>
            <div id="stat-time-today" className="text-xl font-black text-white">{formatDuration(timeStats.todaySeconds)}</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Muscle Focus & Interactive Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Muscle Areas Focus Breakdown */}
        <div className="lg:col-span-1 bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-400" />
              Enfoque Muscular (Histórico)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Visualiza qué áreas están recibiendo mayor volumen de series completadas en tus entrenamientos.
            </p>
          </div>

          <div className="h-60 w-full mt-4 flex items-center justify-center">
            {stats.totalSetsLogged > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={muscleFocusData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={65} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    cursor={{ fill: '#0f172a' }}
                  />
                  <Bar dataKey="value" name="Series Completadas" radius={[0, 4, 4, 0]}>
                    {muscleFocusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-6 space-y-2">
                <BarChart2 className="h-8 w-8 text-slate-650 mx-auto" />
                <p className="text-slate-400 text-xs font-semibold">Falta registrar series para mostrar gráficos de enfoque.</p>
              </div>
            )}
          </div>

          {/* Quick list table of muscle groups sets */}
          <div className="space-y-1.5 pt-4 border-t border-slate-800">
            {muscleFocusData.map((item) => {
              const percentage = stats.totalSetsLogged > 0 
                ? Math.round((item.value / stats.totalSetsLogged) * 100) 
                : 0;

              return (
                <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span>{item.value} series</span>
                    <span className="text-[10px] bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded-md font-bold text-slate-500">
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Interactive Exercise Progression */}
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
            {(['volume', 'max_weight', 'total_reps', 'one_rep_max'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetricType(m)}
                className={`flex-1 min-w-[80px] text-center py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  metricType === m
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-250 hover:bg-slate-900/60'
                }`}
              >
                {m === 'volume' && 'Volumen'}
                {m === 'max_weight' && 'Mejor Peso'}
                {m === 'total_reps' && 'Reps Totales'}
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
                    dataKey={metricType}
                    name={getMetricLabel(metricType)}
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
      </div>

      {/* 2.5. Calendario de Constancia (heatmap deslizante horizontalmente) */}
      <ConstancyCalendar logs={logs} />

      {/* 2.6. Comparativa Interanual + Ranking + Última vez por grupo muscular */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparativa interanual */}
        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2 capitalize">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            {yearOverYear.monthName} vs. Año Pasado
          </h3>
          {yearOverYear.hasPreviousData ? (
            <div className="grid grid-cols-3 gap-2">
              {([
                ['Entrenamientos', yearOverYear.current.workouts, yearOverYear.previous.workouts, ''],
                ['Series', yearOverYear.current.sets, yearOverYear.previous.sets, ''],
                ['Volumen', yearOverYear.current.volume, yearOverYear.previous.volume, ' kg'],
              ] as const).map(([label, curr, prev, suffix]) => {
                const delta = pctChange(curr, prev);
                return (
                  <div key={label} className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-center space-y-1 min-w-0">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">{label}</div>
                    <div className="text-lg font-black text-white truncate">{formatEsNumber(curr)}{suffix}</div>
                    <div className="text-[10px] text-slate-500 truncate">antes: {formatEsNumber(prev)}{suffix}</div>
                    {delta !== null && (
                      <div className={`flex items-center justify-center gap-0.5 text-[10px] font-bold ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {Math.abs(delta)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-6 space-y-2">
              <Calendar className="h-8 w-8 text-slate-650 mx-auto" />
              <p className="text-slate-400 text-xs font-semibold">Aún no hay datos de este mes hace un año para comparar.</p>
            </div>
          )}
        </div>

        {/* Última vez por grupo muscular */}
        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-400" />
            Última Vez por Grupo Muscular
          </h3>
          <div className="space-y-1.5">
            {daysSinceByMuscle.map(({ group, days }) => (
              <div key={group} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getMuscleColor(group) }} />
                  <span className="text-slate-300">{group}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${
                  days === null ? 'bg-slate-950 border-slate-800 text-slate-500'
                  : days <= 3 ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400'
                  : days <= 7 ? 'bg-amber-950/40 border-amber-500/20 text-amber-400'
                  : 'bg-rose-950/40 border-rose-500/20 text-rose-400'
                }`}>
                  {days === null ? 'Sin datos' : days === 0 ? 'Hoy' : `Hace ${days} día${days === 1 ? '' : 's'}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2.7. Ranking de Ejercicios Más Entrenados */}
      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-blue-400" />
          Ejercicios Más Entrenados (por volumen)
        </h3>
        {exerciseRanking.length > 0 ? (
          <div className="space-y-1.5">
            {exerciseRanking.map((item, i) => (
              <div key={item.exerciseId} className="flex items-center gap-3 bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-200 truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-500">{item.sets} series</div>
                </div>
                <div className="text-xs font-extrabold text-blue-400 shrink-0">{formatEsCompactKg(item.volume)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-xs font-semibold text-center py-4">Aún no hay series completadas.</p>
        )}
      </div>

      {/* 2.8. Feed de Récords Históricos */}
      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          Historial de Récords
        </h3>
        {prEvents.length > 0 ? (
          <>
            <div className="space-y-1.5">
              {visiblePrEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                  <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: getMuscleColor(ev.muscleGroup) + '25', color: getMuscleColor(ev.muscleGroup) }}>
                    <Trophy className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-200 truncate">{ev.exerciseName}</div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(ev.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="text-xs font-extrabold text-amber-400 shrink-0 text-right">
                    {ev.type === 'weight' ? `${formatEsNumber(ev.value)} kg` : `${ev.value} reps`}
                    <div className="text-[9px] text-slate-500 font-semibold">antes {ev.type === 'weight' ? `${formatEsNumber(ev.previousValue)} kg` : `${ev.previousValue} reps`}</div>
                  </div>
                </div>
              ))}
            </div>
            {prEvents.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllPrs((v) => !v)}
                className="w-full text-center text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer py-1"
              >
                {showAllPrs ? 'Ver menos' : `Ver los ${prEvents.length} récords`}
              </button>
            )}
          </>
        ) : (
          <p className="text-slate-400 text-xs font-semibold text-center py-4">Todavía no se ha batido ningún récord (hace falta repetir un ejercicio para poder compararlo).</p>
        )}
      </div>

      {/* 3. One Rep Max Calculator Card */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Calc Inputs */}
        <div className="md:col-span-5 space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-400" />
              Calculadora de One Rep Max (1RM)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Estima tu fuerza máxima teórica para una sola repetición basándote en tu mejor rendimiento de fuerza.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Peso Levantado (kg)</label>
                <DecimalInput
                  id="calc-weight-input"
                  value={calcWeight}
                  onChange={(v) => setCalcWeight(v)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Repeticiones</label>
                <input
                  id="calc-reps-input"
                  type="number"
                  min={1}
                  max={30}
                  value={calcReps}
                  onChange={(e) => setCalcReps(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Display Big 1RM estimation */}
            <div className="bg-gradient-to-r from-blue-950/80 to-slate-950 p-5 rounded-2xl text-white text-center shadow-inner relative overflow-hidden border border-blue-500/20">
              <div className="absolute top-2 right-2 opacity-10">
                <Percent className="h-16 w-16" />
              </div>
              <div className="text-xs text-blue-300 font-bold uppercase tracking-widest">1RM Estimado Total</div>
              <div id="calc-1rm-result" className="text-3xl font-black mt-1 text-blue-400">{formatEsNumber(calculated1RM)} <span className="text-sm font-semibold">kg</span></div>
              <div className="text-[10px] text-slate-500 mt-2">Calculado utilizando la fórmula de Epley</div>
            </div>
          </div>
        </div>

        {/* Percentages Table */}
        <div className="md:col-span-7">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Distribución de Cargas por Porcentaje</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {percentageTable.map((row) => (
              <div key={row.percentage} className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-blue-400 block">{row.percentage}%</span>
                  <span className="text-slate-500 text-[10px]">Aprox. {row.reps} {row.reps === 1 ? 'rep' : 'reps'}</span>
                </div>
                <div className="font-extrabold text-slate-300 text-sm">
                  {formatEsNumber(row.weight)} kg
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
        </>
      )}

      <ShareCardModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        stats={stats}
        timeStats={timeStats}
        formatDuration={formatDuration}
        lastWorkout={lastWorkoutShare?.last ?? null}
        lastWorkoutExercises={exercises}
        lastWorkoutHasRecord={lastWorkoutShare?.hasRecord}
        muscleDistribution={muscleFocusData}
        recentPrs={prEvents.slice(0, 4).map((p) => ({
          exerciseName: p.exerciseName,
          type: p.type,
          value: p.value,
          muscleGroup: p.muscleGroup,
        }))}
        topExercises={exerciseRanking.slice(0, 5).map((e) => ({ name: e.name, volume: e.volume }))}
      />
    </div>
  );
}
