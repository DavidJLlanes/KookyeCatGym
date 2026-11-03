import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Calendar, Target, Trophy, ArrowUp, Share2, Map, Sparkles, Images } from 'lucide-react';
import BodyProgressSection, { BodyProgressSectionProps } from './BodyProgressSection';
import BodyWeightSection from './BodyWeightSection';
import ScrollRow from './ScrollRow';
import ExternalAiCard from './ExternalAiCard';
import type { MediaItem } from '../api/client';
import { WorkoutLog, Exercise } from '../types';
import { ProgressionRule } from '../utils/progressionRules';
import { calculateAllBalances as calculateMuscleBalances } from '../utils/muscleBalance';
import { get1RMHistory } from '../utils/oneRMEstimate';
import { generateYearHeatmap } from '../utils/activityHeatmap';
import ShareCardModal from './ShareCardModal';
import ConstancyCalendar from './ConstancyCalendar';
import OneRMChart from './OneRMChart';
import ActivityHeatmap from './ActivityHeatmap';
import MuscleBalanceReport from './muscle/MuscleBalanceReport';
import AICoachPanel from './AICoachPanel';
import { useProgressStats } from '../hooks/useProgressStats';
import StatsBanner from './progress/StatsBanner';
import MuscleFocusCard from './progress/MuscleFocusCard';
import ExerciseProgressCard from './progress/ExerciseProgressCard';
import YearOverYearCard from './progress/YearOverYearCard';
import LastTrainedCard from './progress/LastTrainedCard';
import ExerciseRankingCard from './progress/ExerciseRankingCard';
import RecordsFeedCard from './progress/RecordsFeedCard';
import OneRMCalculatorCard from './progress/OneRMCalculatorCard';
import MuscleTab from './progress/MuscleTab';
import ProgressionTab from './progress/ProgressionTab';

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

type ProgressTab = 'overview' | 'muscle' | 'physique' | 'oneRM' | 'heatmap' | 'progression' | 'balance' | 'coach';

/**
 * Pestaña «Progreso»: cabecera, selector de secciones y la sección activa.
 * Los cálculos globales viven en useProgressStats y cada tarjeta es un
 * componente aparte en components/progress/.
 */
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
  const [progressTab, setProgressTab] = useState<ProgressTab>('overview');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const {
    muscleFocusData, stats, timeStats, yearOverYear, pctChange, exerciseRanking,
    daysSinceByMuscle, prEvents, lastWorkoutShare, formatDuration,
  } = useProgressStats(logs, exercises);

  // Ejercicio seleccionado: compartido por las secciones Resumen, 1RM y Progresión
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


  return (
    <div id="progress-panel" className="space-y-6 text-slate-200">
      {/* 0. Header con acceso a la tarjeta compartible */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="min-w-0 font-black text-white text-lg tracking-tight">Tu Progreso</h2>
        <button id="btn-open-share-card" type="button" onClick={() => setShareModalOpen(true)} className="btn btn-primary btn-sm shrink-0">
          <Share2 />
          Compartir
        </button>
      </div>

      {/* 0.5. Progress View Tabs */}
      <ScrollRow scrollerClassName="flex gap-2 py-1.5 px-0.5" scrollerProps={{ role: 'tablist', 'aria-label': 'Secciones de Progreso' }}>
        {[
          { id: 'overview', label: 'Resumen', icon: TrendingUp },
          { id: 'muscle', label: 'Músculos', icon: Map },
          { id: 'physique', label: 'Físico', icon: Images },
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
              role="tab"
              aria-selected={isActive}
              onClick={() => setProgressTab(tab.id as any)}
              className={`shrink-0 min-h-[2.5rem] px-4 rounded-full border flex items-center gap-2 text-sm font-bold whitespace-nowrap cursor-pointer transition-all ${
                isActive
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-600'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </ScrollRow>

      {/* Content based on selected tab */}

      {progressTab === 'overview' && (
        <>
          <StatsBanner stats={stats} timeStats={timeStats} formatDuration={formatDuration} />

          {/* Músculos trabajados + progresión del ejercicio elegido */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MuscleFocusCard muscleFocusData={muscleFocusData} totalSetsLogged={stats.totalSetsLogged} />
            <ExerciseProgressCard
              logs={logs}
              exercises={exercises}
              selectedExId={selectedExId}
              setSelectedExId={setSelectedExId}
              completedExerciseIds={completedExerciseIds}
            />
          </div>

          <ConstancyCalendar logs={logs} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <YearOverYearCard yearOverYear={yearOverYear} pctChange={pctChange} />
            <LastTrainedCard daysSinceByMuscle={daysSinceByMuscle} />
          </div>

          <ExerciseRankingCard exerciseRanking={exerciseRanking} />
          <RecordsFeedCard prEvents={prEvents} />
          <OneRMCalculatorCard />
        </>
      )}

      {progressTab === 'muscle' && <MuscleTab logs={logs} exercises={exercises} />}

      {progressTab === 'physique' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <BodyWeightSection logs={logs} exercises={exercises} />
          {onUploadProgressPhoto && onUpdatePhoto && onDeletePhoto && (
            <BodyProgressSection
              photos={progressPhotos}
              onUpload={onUploadProgressPhoto}
              onUpdate={onUpdatePhoto}
              onDelete={onDeletePhoto}
            />
          )}
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
        <ProgressionTab
          logs={logs}
          exercises={exercises}
          progressionRules={progressionRules}
          selectedExId={selectedExId}
          setSelectedExId={setSelectedExId}
          completedExerciseIds={completedExerciseIds}
          onSaveProgressionRule={onSaveProgressionRule}
          onDeleteProgressionRule={onDeleteProgressionRule}
        />
      )}

      {progressTab === 'coach' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <AICoachPanel logs={logs} exercises={exercises} progressionRules={progressionRules} />
          <ExternalAiCard logs={logs} exercises={exercises} progressionRules={progressionRules} />
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