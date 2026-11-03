import { Play, Trash2, Edit, ChevronUp, ChevronDown} from 'lucide-react';
import { Routine, Exercise} from '../../types';
import MiniBodyMap from '../muscle/MiniBodyMap';
import { routineMuscles} from '../../utils/sessionMuscles';
import ExerciseThumb from './ExerciseThumb';

interface RoutineCardProps {
  routine: Routine;
  exercises: Exercise[];
  onStart: (routine: Routine) => void;
  onEdit: (routine: Routine) => void;
  onDelete: (routineId: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export default function RoutineCard({ routine, exercises, onStart, onEdit, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: RoutineCardProps) {
  const showReorder = !!(onMoveUp || onMoveDown);
  return (
    <div
      id={`routine-card-${routine.id}`}
      className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg hover:shadow-xl hover:border-slate-700 transition-all duration-300 flex flex-col justify-between"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2 min-w-0">
            {showReorder && (
              <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                <button
                  type="button"
                  onClick={onMoveUp}
                  disabled={!canMoveUp}
                  title="Mover arriba"
                  className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-slate-700 disabled:opacity-25 disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onMoveDown}
                  disabled={!canMoveDown}
                  title="Mover abajo"
                  className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-slate-700 disabled:opacity-25 disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="min-w-0">
              <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold text-blue-400 bg-blue-950/40 border border-blue-500/20 mb-2">
                {routine.dayOfWeek || 'Cualquier día'}
              </span>
              <h3 className="text-lg font-black text-white leading-snug">{routine.name}</h3>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onEdit(routine)}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-750"
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(routine.id)}
              className="p-1.5 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer border border-transparent"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{routine.description}</p>

        <MiniBodyMap sets={routineMuscles(routine, exercises)} height={64} className="mx-auto flex justify-center w-full" />

        {/* Exercises Preview */}
        <div className="space-y-1.5 pt-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ejercicios ({routine.exercises.length})</div>
          <div className="space-y-2">
            {routine.exercises.map((we) => {
              const ex = exercises.find((e) => e.id === we.exerciseId);
              return (
                <div
                  key={we.id}
                  className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden flex items-center gap-3"
                >
                  <ExerciseThumb ex={ex} />
                  <span className="text-xs font-semibold text-slate-300 flex-1 min-w-0 truncate pr-2">
                    {ex ? ex.name : 'Ejercicio'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold pr-3 shrink-0">x{we.sets.length}</span>
                </div>
              );
            })}
            {routine.exercises.length === 0 && (
              <span className="text-xs text-slate-500 italic">Sin ejercicios todavía</span>
            )}
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="pt-5 mt-5 border-t border-slate-800">
        <button
          id={`btn-start-routine-${routine.id}`}
          onClick={() => onStart(routine)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
        >
          <Play className="h-4 w-4 fill-white text-white" />
          Iniciar Entrenamiento
        </button>
      </div>
    </div>
  );
}
