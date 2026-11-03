import { motion, AnimatePresence } from 'motion/react';
import { Shuffle, X } from 'lucide-react';
import { MUSCLE_GROUPS, EQUIPMENT_TYPES, getMuscleColor } from '../../data/exerciseMeta';
import { MUSCLE_ZONE_LABEL } from '../../utils/muscleZone';
import MuscleZoneImage from '../muscle/MuscleZoneImage';
import type { RandomWorkoutFilters } from '../../hooks/useRandomWorkoutFilters';

interface RandomWorkoutModalProps {
  isOpen: boolean;
  filters: RandomWorkoutFilters;
  onClose: () => void;
  onStart: () => void;
}

/** Elegir grupos, zonas y equipamiento para el Entrenamiento Aleatorio. */
export default function RandomWorkoutModal({ isOpen, filters, onClose, onStart }: RandomWorkoutModalProps) {
  const {
    randomGroups, setRandomGroups, randomZones, setRandomZones, randomEquipment, setRandomEquipment,
    randomCount, setRandomCount, toggleRandomGroup, toggleRandomZone, toggleRandomEquipment,
    clearRandomFilters, availableRandomZones, randomPool,
  } = filters;
  return (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-800"
        >
          <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Shuffle className="h-5 w-5 text-blue-400 shrink-0" />
              Entrenamiento Aleatorio
            </h3>
            <button
              type="button"
              onClick={() => onClose()}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[65vh]">
            <p className="text-xs text-slate-400 leading-relaxed">
              Filtra a tu gusto (todo es multiselección y opcional) y pulsa
              <span className="text-slate-200 font-semibold"> Comenzar entrenamiento</span>.
              Lo que dejes vacío cuenta como «todos».
            </p>

            {/* --- GRUPOS MUSCULARES (multiseleccion) --- */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Grupos musculares
                </span>
                {randomGroups.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRandomGroups([])}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map((mg) => {
                  const active = randomGroups.includes(mg);
                  return (
                    <button
                      key={mg}
                      type="button"
                      onClick={() => toggleRandomGroup(mg)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                        active
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: getMuscleColor(mg) }}
                      />
                      {mg}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* --- ZONAS CONCRETAS (multiseleccion, con mini-imagen).
                Se muestran las zonas de los grupos marcados; si no hay
                ninguno marcado, aparecen las 18. --- */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Zonas concretas
                </span>
                {randomZones.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRandomZones([])}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableRandomZones.map((zone) => {
                  const active = randomZones.includes(zone);
                  return (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => toggleRandomZone(zone)}
                      className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                        active
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <MuscleZoneImage
                        zone={zone}
                        className="h-7 w-7 rounded-full object-contain bg-white border border-slate-700 shrink-0 overflow-hidden"
                      />
                      {MUSCLE_ZONE_LABEL[zone]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* --- EQUIPAMIENTO (multiseleccion) --- */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Equipamiento
                </span>
                {randomEquipment.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRandomEquipment([])}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_TYPES.map((eq) => {
                  const active = randomEquipment.includes(eq);
                  return (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => toggleRandomEquipment(eq)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                        active
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {eq}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* --- NUMERO DE EJERCICIOS (3 a 10) --- */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Nº de ejercicios
              </span>
              <div className="flex flex-wrap gap-2">
                {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRandomCount(n)}
                    className={`h-9 w-9 rounded-lg text-sm font-bold transition-all cursor-pointer border ${
                      randomCount === n
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* --- PIE: recuento en vivo + boton de comenzar --- */}
          <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-400">
                <span className={randomPool.length === 0 ? 'text-rose-400 font-bold' : 'text-blue-400 font-bold'}>
                  {randomPool.length}
                </span>{' '}
                {randomPool.length === 1 ? 'ejercicio disponible' : 'ejercicios disponibles'}
              </span>
              {(randomGroups.length > 0 || randomZones.length > 0 || randomEquipment.length > 0) && (
                <button
                  type="button"
                  onClick={clearRandomFilters}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Quitar todos los filtros
                </button>
              )}
            </div>
            {randomPool.length === 0 && (
              <p className="text-[11px] text-rose-400 font-semibold">
                Ningún ejercicio cumple esos filtros. Quita alguno para poder empezar.
              </p>
            )}
            <button
              id="btn-random-confirm"
              type="button"
              disabled={randomPool.length === 0}
              onClick={onStart}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-900 disabled:text-slate-650 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
            >
              <Shuffle className="h-4 w-4 shrink-0" />
              Comenzar entrenamiento
              {randomPool.length > 0 && (
                <span className="opacity-80 font-semibold">
                  ({Math.min(randomCount, randomPool.length)} ejercicios)
                </span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );
}
