import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, Share2, Plus, Dumbbell, FolderPlus } from 'lucide-react';
import { Routine, Exercise } from '../types';
import ConfirmDialog from './ConfirmDialog';
import StarterPlansModal from './StarterPlansModal';
import SharePlanModal from './SharePlanModal';
import RotationSettings from './RotationSettings';
import FolderSection, { NO_FOLDER } from './routines/FolderSection';
import NewFolderModal from './routines/NewFolderModal';
import RoutineEditor from './routines/RoutineEditor';
import { useRoutineFolders } from '../hooks/useRoutineFolders';

interface RoutinesPanelProps {
  routines: Routine[];
  exercises: Exercise[];
  onStartRoutine: (routine: Routine) => void;
  onSaveRoutine: (routine: Routine) => void;
  onDeleteRoutine: (routineId: string) => void;
  // Borrado en bloque SIN confirmación propia (la confirmación la hace este
  // panel al eliminar una carpeta entera con sus rutinas dentro).
  onDeleteRoutines: (routineIds: string[]) => void;
  onReorderRoutines: (updated: Routine[]) => void;
  // Añade varias rutinas de una vez (planes de iniciación)
  onAddRoutines: (routines: Routine[]) => void;
}

// Las carpetas se derivan de la propiedad `folder` de cada rutina, así que una
// carpeta recién creada (todavía sin rutinas) no existiría en ningún sitio.
// Se guarda aparte la lista de carpetas creadas por el usuario para que las

/**
 * Pestaña «Rutinas»: listado por carpetas y, al crear o editar, el formulario
 * (RoutineEditor). La lógica de carpetas vive en useRoutineFolders.
 */
export default function RoutinesPanel({
  routines,
  exercises,
  onStartRoutine,
  onSaveRoutine,
  onDeleteRoutine,
  onDeleteRoutines,
  onReorderRoutines,
  onAddRoutines,
}: RoutinesPanelProps) {
  const [showStarterPlans, setShowStarterPlans] = useState(false);
  const [showSharePlan, setShowSharePlan] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  // Edición: undefined = mostrando el listado; null = rutina nueva; Routine = editando esa
  const [editing, setEditing] = useState<Routine | null | undefined>(undefined);

  const {
    existingFolders, getGroupRoutines, moveFolder, moveRoutineInGroup,
    expandedFolders, toggleFolder, createFolder,
    folderToDelete, setFolderToDelete, confirmDeleteFolder,
  } = useRoutineFolders(routines, onReorderRoutines, onDeleteRoutines);

  const startNewRoutineCreation = () => setEditing(null);
  const startEditingExisting = (routine: Routine) => setEditing(routine);

  return (
    <div id="routines-panel" className="space-y-6 text-slate-200">
      <AnimatePresence mode="wait">
        {editing === undefined ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="space-y-4">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-start gap-2 leading-tight">
                  <ClipboardList className="h-6 w-6 shrink-0 text-blue-400 mt-0.5" />
                  <span className="min-w-0">Tus Rutinas de Entrenamiento</span>
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Crea y personaliza un número ilimitado de rutinas para diferentes días de la semana.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button id="btn-create-routine" onClick={startNewRoutineCreation} className="btn btn-primary col-span-2 sm:col-span-1 sm:order-4">
                  <Plus />
                  Nueva Rutina
                </button>
                <button id="btn-create-folder" onClick={() => setShowNewFolderModal(true)} className="btn btn-secondary">
                  <FolderPlus className="text-blue-400" />
                  Nueva Carpeta
                </button>
                <button id="btn-starter-plans" onClick={() => setShowStarterPlans(true)} className="btn btn-secondary">
                  <Dumbbell className="text-emerald-400" />
                  Planes de iniciación
                </button>
                <button id="btn-share-plan" onClick={() => setShowSharePlan(true)} className="btn btn-secondary col-span-2 sm:col-span-1">
                  <Share2 className="text-sky-400" />
                  Compartir / importar
                </button>
              </div>
            </div>

            {routines.length > 1 && <RotationSettings routines={routines} />}

            {/* Routines agrupadas por carpeta */}
            <div className="space-y-8">
              {existingFolders.map((folder, idx) => (
                <FolderSection
                  key={folder}
                  label={folder}
                  routines={getGroupRoutines(folder)}
                  exercises={exercises}
                  isCollapsed={!expandedFolders.has(folder)}
                  onToggle={() => toggleFolder(folder)}
                  onStart={onStartRoutine}
                  onEdit={startEditingExisting}
                  onDelete={onDeleteRoutine}
                  onMoveRoutineUp={(id) => moveRoutineInGroup(folder, id, 'up')}
                  onMoveRoutineDown={(id) => moveRoutineInGroup(folder, id, 'down')}
                  accentIndex={idx}
                  onMoveFolderUp={() => moveFolder(folder, 'up')}
                  onMoveFolderDown={() => moveFolder(folder, 'down')}
                  canMoveFolderUp={idx > 0}
                  canMoveFolderDown={idx < existingFolders.length - 1}
                  onDeleteFolder={() => setFolderToDelete(folder)}
                />
              ))}

              {/* Rutinas sin carpeta asignada */}
              {(() => {
                const unfiled = getGroupRoutines(null);
                if (unfiled.length === 0) return null;
                return (
                  <FolderSection
                    label={existingFolders.length > 0 ? 'Sin carpeta' : 'Todas las rutinas'}
                    routines={unfiled}
                    exercises={exercises}
                    isCollapsed={!expandedFolders.has(NO_FOLDER)}
                    onToggle={() => toggleFolder(NO_FOLDER)}
                    onStart={onStartRoutine}
                    onEdit={startEditingExisting}
                    onDelete={onDeleteRoutine}
                    onMoveRoutineUp={(id) => moveRoutineInGroup(null, id, 'up')}
                    onMoveRoutineDown={(id) => moveRoutineInGroup(null, id, 'down')}
                  />
                );
              })()}

              {routines.length === 0 && (
                <div className="bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 p-12 text-center">
                  <ClipboardList className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-300 font-medium">No has creado rutinas</p>
                  <p className="text-slate-500 text-xs mt-1">Crea tu primera rutina para estructurar tus entrenamientos.</p>
                  <button
                    onClick={startNewRoutineCreation}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                  >
                    Crear primera rutina
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          // CREATION / EDITING WORKFLOW
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <RoutineEditor
              routine={editing}
              exercises={exercises}
              existingFolders={existingFolders}
              onSave={(routine) => {
                onSaveRoutine(routine);
                setEditing(undefined);
              }}
              onCancel={() => setEditing(undefined)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <NewFolderModal
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onCreate={createFolder}
      />

      <ConfirmDialog
        isOpen={folderToDelete !== null}
        title="Eliminar Carpeta"
        message={(() => {
          if (!folderToDelete) return '';
          const count = routines.filter((r) => r.folder === folderToDelete).length;
          if (count === 0) return `¿Eliminar la carpeta "${folderToDelete}"? Está vacía.`;
          return `¿Eliminar la carpeta "${folderToDelete}" y las ${count} ${
            count === 1 ? 'rutina que contiene' : 'rutinas que contiene'
          }? Esta acción no se puede deshacer.`;
        })()}
        confirmText="Eliminar"
        type="danger"
        onConfirm={confirmDeleteFolder}
        onCancel={() => setFolderToDelete(null)}
      />

      {showSharePlan && (
        <SharePlanModal routines={routines} exercises={exercises} onImport={onAddRoutines} onClose={() => setShowSharePlan(false)} />
      )}

      {showStarterPlans && (
        <StarterPlansModal
          exercises={exercises}
          existingFolders={existingFolders}
          onAdd={onAddRoutines}
          onClose={() => setShowStarterPlans(false)}
        />
      )}
    </div>
  );
}
