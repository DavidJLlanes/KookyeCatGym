import React, { useState, Suspense, lazy } from 'react';
import { AnimatePresence } from 'motion/react';


import { WorkoutLog } from './types';
import { activeWorkoutPhotoKey } from './utils/photoTools';
import { useUserData } from './context/UserDataContext';
import WorkoutLogEditor from './components/WorkoutLogEditor';
import NextSessionCard from './components/NextSessionCard';
import WeekPlanCard from './components/WeekPlanCard';
import { blankLog } from './utils/logEdit';
import MuscleSessionModal from './components/muscle/MuscleSessionModal';
import ProgramCard from './components/programs/ProgramCard';

import AppHeader from './components/app/AppHeader';
import { AppTab, MobileNav } from './components/app/AppNav';
import TabTransition from './components/app/TabTransition';
import TrainHero from './components/app/TrainHero';
import WorkoutHistory from './components/app/WorkoutHistory';
import BackupModal from './components/app/BackupModal';
import FinishedWorkoutModal from './components/app/FinishedWorkoutModal';
import RandomWorkoutModal from './components/app/RandomWorkoutModal';
import { useConfirmDialog } from './hooks/useConfirmDialog';
import { useMediaActions } from './hooks/useMediaActions';
import { useLibraryActions } from './hooks/useLibraryActions';
import { useWorkoutSession } from './hooks/useWorkoutSession';
import { useDataTransfer } from './hooks/useDataTransfer';
import { useGymData } from './hooks/useGymData';
import { useRandomWorkoutFilters } from './hooks/useRandomWorkoutFilters';
import ExerciseLibraryPanel from './components/ExerciseLibraryPanel';
import ActiveWorkoutPanel from './components/workout/ActiveWorkoutPanel';
import PlateCalculatorModal from './components/PlateCalculatorModal';
import ConfirmDialog from './components/ConfirmDialog';
import { AuthUser } from './auth';
import LegalFooterLinks from './components/legal/LegalFooterLinks';

// Cargados de forma diferida: no se necesitan hasta que el usuario visita esa
// pestaña en concreto (Progreso arrastra además la librería de gráficos, que
// así deja de formar parte de la carga inicial).
const RoutinesPanel = lazy(() => import('./components/RoutinesPanel'));
const ProgressPanel = lazy(() => import('./components/ProgressPanel'));
const UserManagementPanel = lazy(() => import('./components/UserManagementPanel'));
const NutritionTab = lazy(() => import('./components/NutritionTab'));
const PhotosPanel = lazy(() => import('./components/PhotosPanel'));

function TabLoadingFallback() {
  return <div className="p-10 text-center text-slate-500 text-sm">Cargando…</div>;
}

interface AppContentProps {
  currentUser: AuthUser;
  onLogout: () => void;
}

export default function AppContent({ currentUser, onLogout }: AppContentProps) {
  const [currentTab, setCurrentTab] = useState<AppTab>('train');
  const isAdmin = currentUser.role === 'admin';

  // Celebration overlay state
  const [justFinishedWorkout, setJustFinishedWorkout] = useState<WorkoutLog | null>(null);
  const [recordsMessage, setRecordsMessage] = useState<string | null>(null);
  const [showRandomWorkoutModal, setShowRandomWorkoutModal] = useState(false);
  const [showMuscleSession, setShowMuscleSession] = useState(false);

  const gym = useGymData();
  const {
    exercises, setExercises, routines, logs, setLogs, progressionRules,
    exerciseMedia, setExerciseMedia, exerciseOnlyMedia, workoutPhotos, progressPhotos,
    displayExercises, existingLogIds, saveExercises, saveRoutines, saveLogs,
    activeWorkout, saveActiveWorkoutState,
  } = gym;
  const randomFilters = useRandomWorkoutFilters(exercises);
  const { data: userData } = useUserData();
  const [editingLog, setEditingLog] = useState<{ log: WorkoutLog; isNew: boolean } | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // Plate Math Modal
  const [showPlateCalculator, setShowPlateCalculator] = useState(false);

  const { confirm, dialogProps } = useConfirmDialog();

  const { handleSaveProgressionRule, handleDeleteProgressionRule } = gym;
  const {
    handleUploadMedia, handleUploadWorkoutPhoto, handleUploadProgressPhoto,
    handleUpdatePhoto, handleSetPrimaryMedia, handleDeleteMedia,
  } = useMediaActions(logs, setExerciseMedia);

  const {
    handleSaveRoutine, handleAddRoutines, handleReorderRoutines, handleDeleteRoutines,
    handleDeleteRoutine, handleAddCustomExercise, handleDeleteLog,
  } = useLibraryActions({ routines, exercises, logs, saveRoutines, saveExercises, saveLogs, confirm });

  const {
    handleStartFreeWorkout, handleStartMuscleSession, handleStartRandomWorkout, handleStartRoutine,
    handleUpdateActiveWorkout, handleFinishWorkout, handleCancelWorkout,
  } = useWorkoutSession({
    exercises, routines, logs, progressionRules, userData, activeWorkout, saveActiveWorkoutState,
    saveRoutines, saveLogs, exerciseMedia, setExerciseMedia, randomFilters, confirm,
    ui: {
      closeMuscleSession: () => setShowMuscleSession(false),
      closeRandomWorkout: () => setShowRandomWorkoutModal(false),
      setJustFinishedWorkout,
      setRecordsMessage,
      goToTab: setCurrentTab,
    },
  });

  const {
    handleImportWorkouts, handleExportData, handleExportWorkoutsCsv, handleExportBodyCsv, handleRestoreBackup,
  } = useDataTransfer({ exercises, routines, logs, userData, setExercises, setLogs, saveExercises, saveRoutines, saveLogs });

  // Guarda un entrenamiento corregido o registrado a posteriori. El historial se
  // mantiene ordenado por fecha (más reciente primero) y los récords se
  // recalculan solos, porque salen siempre del historial.
  const handleSaveEditedLog = (saved: WorkoutLog) => {
    const without = logs.filter((l) => l.id !== saved.id);
    const next = [...without, saved].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    saveLogs(next);
    setEditingLog(null);
  };

  return (
    <div id="hevy-app-container" className="min-h-dvh bg-slate-950 text-slate-200 flex flex-col pb-[calc(6rem+env(safe-area-inset-bottom))] font-sans">
      <AppHeader
        username={currentUser.username}
        isAdmin={isAdmin}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onBackup={() => setShowBackupModal(true)}
        onLogout={onLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {currentTab === 'train' && (
            <TabTransition key="train-tab" className="space-y-6 text-left">
              <TrainHero
                onStartFree={handleStartFreeWorkout}
                onGoToRoutines={() => setCurrentTab('routines')}
                onStartByMuscle={() => setShowMuscleSession(true)}
                onStartRandom={() => setShowRandomWorkoutModal(true)}
              />
              <ProgramCard exercises={exercises} logs={logs} onStartSession={handleStartRoutine} />
              <NextSessionCard routines={routines} logs={logs} exercises={exercises} onStart={handleStartRoutine} />
              <WeekPlanCard routines={routines} logs={logs} exercises={exercises} onStart={handleStartRoutine} />
              <WorkoutHistory
                logs={logs}
                exercises={exercises}
                workoutPhotos={workoutPhotos}
                onGoToProgress={() => setCurrentTab('progress')}
                onAddPast={() => setEditingLog({ log: blankLog(), isNew: true })}
                onEditLog={(log) => setEditingLog({ log, isNew: false })}
                onDeleteLog={handleDeleteLog}
                onUploadPhoto={handleUploadWorkoutPhoto}
                onDeletePhoto={handleDeleteMedia}
              />
            </TabTransition>
          )}

          {currentTab === 'routines' && (
            <TabTransition key="routines-tab">
              <Suspense fallback={<TabLoadingFallback />}>
                <RoutinesPanel
                  routines={routines}
                  exercises={displayExercises}
                  onStartRoutine={handleStartRoutine}
                  onSaveRoutine={handleSaveRoutine}
                  onDeleteRoutine={handleDeleteRoutine}
                  onDeleteRoutines={handleDeleteRoutines}
                  onReorderRoutines={handleReorderRoutines}
                  onAddRoutines={handleAddRoutines}
                />
              </Suspense>
            </TabTransition>
          )}

          {currentTab === 'exercises' && (
            <TabTransition key="exercises-tab">
              <ExerciseLibraryPanel
                exercises={displayExercises}
                onAddCustomExercise={handleAddCustomExercise}
                media={exerciseOnlyMedia}
                onUploadMedia={handleUploadMedia}
                onDeleteMedia={handleDeleteMedia}
                onSetPrimaryMedia={handleSetPrimaryMedia}
                logs={logs}
              />
            </TabTransition>
          )}

          {currentTab === 'progress' && (
            <TabTransition key="progress-tab">
              <Suspense fallback={<TabLoadingFallback />}>
                <ProgressPanel
                  logs={logs}
                  exercises={exercises}
                  progressionRules={progressionRules}
                  onSaveProgressionRule={handleSaveProgressionRule}
                  onDeleteProgressionRule={handleDeleteProgressionRule}
                  progressPhotos={progressPhotos}
                  onUploadProgressPhoto={handleUploadProgressPhoto}
                  onUpdatePhoto={handleUpdatePhoto}
                  onDeletePhoto={handleDeleteMedia}
                />
              </Suspense>
            </TabTransition>
          )}

          {currentTab === 'nutrition' && (
            <TabTransition key="nutrition-tab">
              <Suspense fallback={<TabLoadingFallback />}>
                <NutritionTab logs={logs} />
              </Suspense>
            </TabTransition>
          )}

          {currentTab === 'photos' && (
            <TabTransition key="photos-tab">
              <Suspense fallback={<TabLoadingFallback />}>
                <PhotosPanel
                  photos={exerciseMedia}
                  logs={logs}
                  activeWorkoutKey={activeWorkout ? activeWorkoutPhotoKey(activeWorkout.startTime) : null}
                  activeWorkoutName={activeWorkout?.routineName ?? null}
                  onUploadWorkoutPhoto={handleUploadWorkoutPhoto}
                  onUploadProgressPhoto={handleUploadProgressPhoto}
                  onUpdatePhoto={handleUpdatePhoto}
                  onDeletePhoto={handleDeleteMedia}
                />
              </Suspense>
            </TabTransition>
          )}

          {currentTab === 'users' && isAdmin && (
            <TabTransition key="users-tab">
              <Suspense fallback={<TabLoadingFallback />}>
                <UserManagementPanel currentUser={currentUser} />
              </Suspense>
            </TabTransition>
          )}
        </AnimatePresence>
      </main>

      {/* Pie: enlaces legales + atribución requerida por la licencia de ExerciseDB (uso no comercial) */}
      <div className="px-4 pb-4 pt-1 space-y-2">
        <LegalFooterLinks />
        <p className="text-center text-[10px] text-slate-600">
          Animaciones de ejercicios cortesía de{' '}
          <a href="https://ascendapi.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-400">
            ExerciseDB / AscendAPI
          </a>
        </p>
      </div>

      <ActiveWorkoutPanel
        activeWorkout={activeWorkout}
        exercises={displayExercises}
        logs={logs}
        routines={routines}
        progressionRules={progressionRules}
        onUpdateWorkout={handleUpdateActiveWorkout}
        onFinishWorkout={handleFinishWorkout}
        onCancelWorkout={handleCancelWorkout}
        onOpenPlateCalculator={() => setShowPlateCalculator(true)}
        photos={activeWorkout ? workoutPhotos.filter((p) => p.logId === activeWorkoutPhotoKey(activeWorkout.startTime)) : []}
        onUploadPhoto={
          activeWorkout ? (file, onProgress) => handleUploadWorkoutPhoto(activeWorkoutPhotoKey(activeWorkout.startTime), file, onProgress) : undefined
        }
        onDeletePhoto={handleDeleteMedia}
      />

      <PlateCalculatorModal
        isOpen={showPlateCalculator}
        onClose={() => setShowPlateCalculator(false)}
        onSelectWeight={() => {
          // El modal se cierra automáticamente; el usuario puede usar el peso calculado como referencia
        }}
      />

      <MobileNav current={currentTab} isAdmin={isAdmin} onSelect={setCurrentTab} />

      <BackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        exercises={exercises}
        existingLogIds={existingLogIds}
        hasLogs={logs.length > 0}
        hasBodyWeights={userData['body-weights'].length > 0}
        onExportJson={handleExportData}
        onExportWorkoutsCsv={handleExportWorkoutsCsv}
        onExportBodyCsv={handleExportBodyCsv}
        onRestoreJson={(json) => handleRestoreBackup(json, () => setShowBackupModal(false))}
        onImportWorkouts={handleImportWorkouts}
      />

      {editingLog && (
        <WorkoutLogEditor
          log={editingLog.log}
          isNew={editingLog.isNew}
          exercises={displayExercises}
          onSave={handleSaveEditedLog}
          onClose={() => setEditingLog(null)}
        />
      )}

      <FinishedWorkoutModal
        log={justFinishedWorkout}
        exercises={exercises}
        recordsMessage={recordsMessage}
        onDismiss={() => {
          setJustFinishedWorkout(null);
          setRecordsMessage(null);
        }}
      />

      {showMuscleSession && <MuscleSessionModal onClose={() => setShowMuscleSession(false)} onCreate={handleStartMuscleSession} />}

      <RandomWorkoutModal
        isOpen={showRandomWorkoutModal}
        filters={randomFilters}
        onClose={() => setShowRandomWorkoutModal(false)}
        onStart={handleStartRandomWorkout}
      />

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
