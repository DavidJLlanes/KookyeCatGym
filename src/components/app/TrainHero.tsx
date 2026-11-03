import { ClipboardList, Plus, Shuffle, Target } from 'lucide-react';

interface TrainHeroProps {
  onStartFree: () => void;
  onGoToRoutines: () => void;
  onStartByMuscle: () => void;
  onStartRandom: () => void;
}

/** Banner de bienvenida con los cuatro modos de empezar a entrenar. */
export default function TrainHero({ onStartFree, onGoToRoutines, onStartByMuscle, onStartRandom }: TrainHeroProps) {
  return (
    <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-slate-100 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden border border-slate-800">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-12 translate-x-12" />

      <div className="space-y-3 z-10">
        <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-500/20">
          Entrenamientos Inteligentes
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white">
          ¡Bienvenido de vuelta, Guerrero!
        </h1>
        <p className="text-slate-300 text-sm max-w-lg">
          Inicia un entrenamiento vacío para añadir ejercicios libremente sobre la marcha, o selecciona una de tus rutinas estructuradas.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 z-10 w-full lg:w-[30rem] shrink-0">
        <button
          id="btn-start-empty-workout"
          onClick={onStartFree}
          className="btn btn-primary btn-lg"
        >
          <Plus />
          Entrenamiento Libre
        </button>
        <button
          onClick={onGoToRoutines}
          className="btn btn-secondary btn-lg"
        >
          <ClipboardList className="text-blue-400" />
          Iniciar una Rutina
        </button>
        <button
          id="btn-start-muscle-workout"
          onClick={onStartByMuscle}
          className="btn btn-secondary btn-lg"
        >
          <Target className="text-blue-400" />
          Por músculos
        </button>
        <button
          id="btn-start-random-workout"
          onClick={onStartRandom}
          className="btn btn-secondary btn-lg"
        >
          <Shuffle className="text-blue-400" />
          Entrenamiento Aleatorio
        </button>
      </div>
    </div>
  );
}
