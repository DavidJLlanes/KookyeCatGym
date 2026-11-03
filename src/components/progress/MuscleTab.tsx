import React, { useState, useMemo} from 'react';
import { motion } from 'motion/react';
import { WorkoutLog, Exercise } from '../../types';
import { calculateMuscleStats, calculateBodyLoad, calculateRecovery, calculateUntrained } from '../../utils/muscleStats';
import MuscleMapVisual, { MapMode } from '../muscle/MuscleMapVisual';


interface MuscleTabProps {
  logs: WorkoutLog[];
  exercises: Exercise[];
}

/** Mapa muscular con volumen, carga corporal, recuperación y músculos sin entrenar. */
export default function MuscleTab({ logs, exercises }: MuscleTabProps) {
  const [selectedMuscle, setSelectedMuscle] = useState<string | undefined>();
  const [musclePeriod, setMusclePeriod] = useState<number | null>(30);
  const [mapMode, setMapMode] = useState<MapMode>('volume');
  const muscleStats = useMemo(() => calculateMuscleStats(logs, exercises, musclePeriod), [logs, exercises, musclePeriod]);
  const bodyLoad = useMemo(() => calculateBodyLoad(logs, exercises, musclePeriod), [logs, exercises, musclePeriod]);
  const recoveryStatus = useMemo(() => calculateRecovery(logs, exercises), [logs, exercises]);
  const untrainedStatus = useMemo(() => calculateUntrained(logs, exercises), [logs, exercises]);
  const lastLogDate = useMemo(
    () => logs.reduce<string | null>((latest, l) => (!latest || new Date(l.date) > new Date(latest) ? l.date : latest), null),
    [logs]
  );


  return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {([['volume', 'Volumen'], ['recovery', 'Recuperación'], ['untrained', 'Sin entrenar']] as [MapMode, string][]).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMapMode(m)}
              aria-pressed={mapMode === m}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${mapMode === m ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {mapMode === 'recovery' && <p className="text-xs text-slate-500">En ámbar, lo que sigue recuperándose: cuanto más intenso, más reciente y más series. Un músculo apagado ya puede volver a entrenarse.</p>}
        {mapMode === 'untrained' && <p className="text-xs text-slate-500">En rojo, lo que lleva una semana o más sin trabajarse; el más intenso, un mes o más (o nunca).</p>}
        <div className={`flex gap-2 flex-wrap ${mapMode === 'volume' ? '' : 'hidden'}`}>
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
        {mapMode === 'volume' && Object.keys(bodyLoad).length === 0 && (
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
          mode={mapMode}
          partStatus={mapMode === 'recovery' ? recoveryStatus : mapMode === 'untrained' ? untrainedStatus : undefined}
        />
      </motion.div>
  );
}
