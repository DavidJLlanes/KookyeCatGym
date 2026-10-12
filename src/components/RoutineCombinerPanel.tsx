import React, { useState } from 'react';
import { Routine } from '../types';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { MultiRoutineConfig, combineRoutines, addRoutineToDay, removeRoutineFromDay } from '../utils/routineCombinator';

interface RoutineCombinerPanelProps {
  config: MultiRoutineConfig;
  routines: Routine[];
  onConfigChange: (config: MultiRoutineConfig) => void;
}

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function RoutineCombinerPanel({
  config,
  routines,
  onConfigChange,
}: RoutineCombinerPanelProps) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const handleAddRoutine = (day: string, routineId: string) => {
    const newConfig = addRoutineToDay(day, routineId, config);
    onConfigChange(newConfig);
  };

  const handleRemoveRoutine = (day: string, routineId: string) => {
    const newConfig = removeRoutineFromDay(day, routineId, config);
    onConfigChange(newConfig);
  };

  const getDayRoutines = (day: string) => {
    const dayConfig = config.routines.find((r) => r.dayOfWeek === day);
    return dayConfig?.routineIds || [];
  };

  const getDayExerciseCount = (day: string) => {
    const dayRoutineIds = getDayRoutines(day);
    const selectedRoutines = routines.filter((r) => dayRoutineIds.includes(r.id));
    return selectedRoutines.reduce((sum, r) => sum + r.exercises.length, 0);
  };

  return (
    <div className="space-y-3">
      {/* Info */}
      <div className="p-3 bg-blue-950/20 rounded-lg border border-blue-500/30 text-xs text-blue-300">
        <strong>💡 Múltiples Rutinas:</strong> Asigna varias rutinas al mismo día para combinar ejercicios.
      </div>

      {/* Weekly View */}
      <div className="space-y-2">
        {WEEK_DAYS.map((day) => {
          const dayRoutineIds = getDayRoutines(day);
          const dayRoutineList = routines.filter((r) => dayRoutineIds.includes(r.id));
          const exerciseCount = getDayExerciseCount(day);
          const isExpanded = expandedDay === day;

          return (
            <div key={day} className="border border-slate-800 rounded-lg overflow-hidden">
              {/* Day Header */}
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day)}
                className="w-full p-3 bg-slate-900 hover:bg-slate-850 transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex-1 text-left">
                  <div className="font-bold text-slate-200">{day}</div>
                  {dayRoutineList.length > 0 && (
                    <div className="text-xs text-slate-400 mt-1">
                      {dayRoutineList.length} rutina(s) • {exerciseCount} ejercicios
                    </div>
                  )}
                </div>
                <div className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </div>
              </button>

              {/* Day Content */}
              {isExpanded && (
                <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-3">
                  {/* Assigned Routines */}
                  {dayRoutineList.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-400">Rutinas asignadas:</div>
                      {dayRoutineList.map((routine) => (
                        <div
                          key={routine.id}
                          className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <GripVertical className="h-3 w-3 text-slate-500 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-200 truncate">{routine.name}</div>
                              <div className="text-xs text-slate-400">
                                {routine.exercises.length} ejercicios
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveRoutine(day, routine.id)}
                            className="p-1.5 hover:bg-red-950/40 text-red-400 rounded transition shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Routine */}
                  <div className="text-xs font-bold text-slate-400 mb-2">Añadir rutina:</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {routines
                      .filter((r) => !dayRoutineIds.includes(r.id))
                      .map((routine) => (
                        <button
                          key={routine.id}
                          onClick={() => handleAddRoutine(day, routine.id)}
                          className="w-full p-2 text-left text-sm hover:bg-blue-950/40 rounded border border-blue-500/20 text-blue-400 transition flex items-center gap-2"
                        >
                          <Plus className="h-3 w-3" />
                          {routine.name}
                        </button>
                      ))}
                  </div>

                  {routines.filter((r) => !dayRoutineIds.includes(r.id)).length === 0 && (
                    <div className="text-xs text-slate-500 italic text-center py-2">
                      Todas las rutinas asignadas
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1">
        <div className="font-bold text-slate-300">Resumen semanal:</div>
        {config.routines.length > 0 ? (
          config.routines.map((dayConfig) => {
            const dayRoutines = routines.filter((r) => dayConfig.routineIds.includes(r.id));
            const totalExercises = dayRoutines.reduce((sum, r) => sum + r.exercises.length, 0);
            return (
              <div key={dayConfig.dayOfWeek} className="text-slate-400">
                <strong className="text-slate-300">{dayConfig.dayOfWeek}:</strong> {dayRoutines.map((r) => r.name).join(' + ')} ({totalExercises} ejercicios)
              </div>
            );
          })
        ) : (
          <div className="text-slate-500 italic">Sin rutinas asignadas</div>
        )}
      </div>
    </div>
  );
}
