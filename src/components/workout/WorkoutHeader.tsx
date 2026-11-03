import React from 'react';
import { Bell, BellOff, Calculator, Check, ChevronDown, Clock, LayoutGrid, List, PersonStanding, Square, Timer } from 'lucide-react';
import PhotoCaptureButtons from '../PhotoCaptureButtons';
import type { WorkoutView } from './types';
import { formatClock } from '../../utils/clock';
import { formatRest } from '../../utils/restTimes';

interface WorkoutHeaderProps {
  routineName: string;
  elapsedSeconds: number;
  rest: { enabled: boolean; onToggleEnabled: () => void; defaultSeconds: number; onOpenWheel: () => void };
  push: { on: boolean; busy: boolean; message: string | null; onToggle: () => void };
  view: WorkoutView;
  onViewChange: (view: WorkoutView) => void;
  /** Solo se muestra si la sesión tiene ejercicios por tiempo. */
  holdAuto?: { on: boolean; onToggle: () => void };
  photos?: { count: number; progress: number | null; onFiles: (files: File[]) => void };
  onOpenPlateCalculator?: () => void;
  onOpenMuscles?: () => void;
  onMinimize: () => void;
  onCancel: () => void;
  onFinish: () => void;
  /** Barras de temporizador (descanso, cronómetro de series por tiempo). */
  children?: React.ReactNode;
}

const chip = (on: boolean, tone: 'blue' | 'amber' | 'emerald', clickable = true) =>
  `flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg border transition-all shrink-0 ${clickable ? 'cursor-pointer' : ''} ${
    on
      ? {
          blue: 'text-blue-400 bg-blue-950/40 border-blue-500/20',
          amber: 'text-amber-300 bg-amber-950/40 border-amber-500/30',
          emerald: 'text-emerald-300 bg-emerald-950/40 border-emerald-500/30',
        }[tone]
      : 'text-slate-500 bg-slate-950 border-slate-800'
  }`;

export default function WorkoutHeader({
  routineName,
  elapsedSeconds,
  rest,
  push,
  view,
  onViewChange,
  holdAuto,
  photos,
  onOpenPlateCalculator,
  onOpenMuscles,
  onMinimize,
  onCancel,
  onFinish,
  children,
}: WorkoutHeaderProps) {
  return (
    <div className="bg-slate-900 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 shadow-lg space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-black text-white text-base sm:text-xl truncate min-w-0">{routineName}</h3>
        <button
          type="button"
          onClick={onMinimize}
          title="Minimizar"
          aria-label="Minimizar el entrenamiento"
          className="icon-btn !h-10 !w-10 bg-slate-800 border-slate-700"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* Cronómetro, descanso automático y avisos. Cada chip es shrink-0: caben juntos en una fila. */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-950/40 px-2 py-1 rounded-lg border border-blue-500/20 animate-pulse shrink-0">
          <Clock className="h-3.5 w-3.5" />
          {formatClock(elapsedSeconds)}
        </span>

        <div className={chip(rest.enabled, 'blue', false)}>
          <button
            type="button"
            onClick={rest.onToggleEnabled}
            title={rest.enabled ? 'Desactivar descanso automático' : 'Activar descanso automático'}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="h-3.5 w-3.5" />
            Descanso {rest.enabled ? 'ON' : 'OFF'}
          </button>
          <span className="w-px h-3 bg-current opacity-25 shrink-0" />
          <button
            type="button"
            onClick={rest.onOpenWheel}
            title="Descanso (se aplica a todos los ejercicios de este entrenamiento)"
            className="min-w-8 bg-transparent text-center font-extrabold cursor-pointer"
          >
            {rest.defaultSeconds === 0 ? 'Sin' : formatRest(rest.defaultSeconds)}
          </button>
        </div>

        <button
          type="button"
          onClick={push.onToggle}
          disabled={push.busy}
          title={push.on ? 'Aviso con la app cerrada: activado' : 'Avisarme del fin del descanso aunque la app esté cerrada'}
          aria-label={`Aviso de fin de descanso con la app cerrada: ${push.on ? 'activado' : 'desactivado'}`}
          aria-pressed={push.on}
          className={`${chip(push.on, 'amber')} !px-2 disabled:opacity-50`}
        >
          {push.on ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
        </button>

        {holdAuto && (
          <button
            type="button"
            onClick={holdAuto.onToggle}
            title="Al acabar el descanso, empezar solo el cronómetro de la siguiente serie por tiempo"
            aria-label={`Cronómetro automático de series por tiempo: ${holdAuto.on ? 'activado' : 'desactivado'}`}
            aria-pressed={holdAuto.on}
            className={`${chip(holdAuto.on, 'emerald')} !px-2`}
          >
            <Timer className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {push.message && (
        <div className="text-[11px] text-amber-200/90 bg-amber-950/30 border border-amber-500/20 rounded-lg px-2.5 py-1.5">{push.message}</div>
      )}

      {/* Vista, fotos y herramientas */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-0.5 shrink-0" role="group" aria-label="Vista del entrenamiento">
          {(
            [
              ['cards', LayoutGrid, 'Tarjetas'],
              ['list', List, 'Lista'],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onViewChange(value)}
              aria-pressed={view === value}
              title={`Vista de ${label.toLowerCase()}`}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                view === value ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {photos && (
          <div className="relative flex items-center bg-slate-800 border border-slate-700 rounded-xl shrink-0" title="Fotos del entrenamiento">
            <PhotoCaptureButtons compact allowVideo onFiles={photos.onFiles} disabled={photos.progress !== null} />
            {photos.count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-blue-600 text-[9px] font-black text-white flex items-center justify-center">
                {photos.count}
              </span>
            )}
            {photos.progress !== null && (
              <span className="absolute inset-x-1 bottom-0.5 h-0.5 bg-slate-700 rounded-full overflow-hidden">
                <span className="block h-full bg-blue-500" style={{ width: `${Math.max(5, photos.progress * 100)}%` }} />
              </span>
            )}
          </div>
        )}
        {onOpenPlateCalculator && (
          <button type="button" onClick={onOpenPlateCalculator} title="Calculadora de discos" aria-label="Calculadora de discos" className="btn btn-secondary btn-sm shrink-0">
            <Calculator />
          </button>
        )}
        {onOpenMuscles && (
          <button
            type="button"
            onClick={onOpenMuscles}
            title="Músculos de la sesión: series planeadas y hechas"
            aria-label="Músculos de la sesión"
            className="btn btn-secondary btn-sm shrink-0"
          >
            <PersonStanding />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="btn btn-danger">
          <Square />
          Cancelar
        </button>
        <button type="button" id="btn-finish-active-workout" onClick={onFinish} className="btn btn-success">
          <Check />
          Finalizar
        </button>
      </div>

      {children}
    </div>
  );
}
