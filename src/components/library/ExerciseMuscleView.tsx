import { useState } from 'react';
import { Activity, Gauge, Lightbulb, Target } from 'lucide-react';
import { Exercise } from '../../types';
import { MUSCLE_ZONE_LABEL, detectMuscleZone } from '../../utils/muscleZone';
import { techniqueNotes } from '../../utils/exerciseTechnique';
import MuscleZoneImage from '../muscle/MuscleZoneImage';

type Section = 'muscles' | 'technique';

/**
 * Pestaña «Grupo muscular» de la ficha de un ejercicio: la ilustración de la zona
 * trabajada en grande, con los músculos implicados y, aparte, las pautas de técnica.
 */
export default function ExerciseMuscleView({ exercise }: { exercise: Exercise }) {
  const [section, setSection] = useState<Section>('muscles');
  const zone = detectMuscleZone(exercise);
  const notes = techniqueNotes(exercise);

  return (
    <div id="exercise-muscle-view" className="bg-slate-950">
      <div role="tablist" className="flex border-b border-slate-800/80 text-xs">
        {([['muscles', 'Músculos implicados'], ['technique', 'Técnica']] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={section === id}
            onClick={() => setSection(id)}
            className={`flex-1 py-2.5 font-bold border-b-2 cursor-pointer transition-colors ${
              section === id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'muscles' ? (
        <div>
          <div className="relative h-[min(340px,40dvh)] w-full bg-slate-900/40">
            <MuscleZoneImage zone={zone} className="w-full h-full object-contain p-2" />
            <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white bg-blue-600 shadow-md">
              {MUSCLE_ZONE_LABEL[zone]}
            </span>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 text-xs">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 min-w-0">
              <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Target className="h-3 w-3 text-blue-400" /> Músculo principal</dt>
              <dd className="mt-1 font-bold text-blue-300 break-words">{notes.primaryActivation}</dd>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 min-w-0">
              <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Activity className="h-3 w-3 text-blue-400" /> Músculos secundarios</dt>
              <dd className="mt-1 font-medium text-slate-300 break-words">{notes.synergists}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="p-3 space-y-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Gauge className="h-3 w-3 text-amber-400" /> Ritmo sugerido</div>
              <p className="mt-1 font-medium text-slate-200 break-words">{notes.tempo}</p>
              <p className="mt-1 text-[10px] text-slate-500">Segundos de bajada · pausa abajo · subida · pausa arriba.</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Activity className="h-3 w-3 text-blue-400" /> Rango de movimiento</div>
              <p className="mt-1 font-medium text-slate-200 break-words">{notes.idealAngle}</p>
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Lightbulb className="h-3 w-3 text-emerald-400" /> Consejos de técnica</div>
            <ul className="mt-1.5 space-y-1.5 text-slate-300 list-disc pl-4">
              {notes.tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
          <p className="text-[10px] text-slate-600">Pautas generales según el grupo muscular y el tipo de ejercicio; no sustituyen a un entrenador.</p>
        </div>
      )}
    </div>
  );
}
