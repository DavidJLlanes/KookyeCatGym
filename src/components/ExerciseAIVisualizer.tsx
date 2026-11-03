import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Brain, Cpu, Activity, ShieldAlert, Zap } from 'lucide-react';
import { Exercise } from '../types';
import { detectMuscleZone } from '../utils/muscleZone';
import MuscleZoneImage from './muscle/MuscleZoneImage';

interface ExerciseAIVisualizerProps {
  exercise: Exercise;
}

export default function ExerciseAIVisualizer({ exercise }: ExerciseAIVisualizerProps) {
  const [scanActive] = useState(true);
  const [activeTab, setActiveTab] = useState<'anatomy' | 'insights'>('anatomy');

  const zone = detectMuscleZone(exercise);

  // Detect specific sub-muscle stimulation and equipment based on exercise names
  const nameLower = exercise.name.toLowerCase();
  const isUpper = nameLower.includes('inclinado') || nameLower.includes('superior') || nameLower.includes('alto') || nameLower.includes('incline');
  const isLower = nameLower.includes('declinado') || nameLower.includes('inferior') || nameLower.includes('bajo') || nameLower.includes('fondos') || nameLower.includes('decline');
  const isFly = nameLower.includes('aperturas') || nameLower.includes('cruces') || nameLower.includes('fly') || nameLower.includes('cable-fly') || nameLower.includes('pec deck') || nameLower.includes('pájaro') || nameLower.includes('apertura');
  const isDeadlift = nameLower.includes('muerto') || nameLower.includes('deadlift');
  const isRow = nameLower.includes('remo') || nameLower.includes('row');
  const isTricep = exercise.muscleGroup === 'Brazos' && (nameLower.includes('trícep') || nameLower.includes('fondos') || nameLower.includes('copa') || nameLower.includes('rompecráneos') || nameLower.includes('skull') || nameLower.includes('kickback') || nameLower.includes('patada') || nameLower.includes('press cerrado'));
  const isCalf = nameLower.includes('pantorrilla') || nameLower.includes('calves') || nameLower.includes('gemelos') || nameLower.includes('gemelo') || nameLower.includes('calf') || nameLower.includes('talón') || nameLower.includes('talon') || nameLower.includes('talones');
  const isGlute = nameLower.includes('glúteo') || nameLower.includes('hip thrust') || nameLower.includes('puente');
  const isLateral = nameLower.includes('lateral') || nameLower.includes('vuelos') || nameLower.includes('raises') || nameLower.includes('deltoides lateral');
  const isRearDelt = nameLower.includes('posterior') || nameLower.includes('pájaro') || nameLower.includes('face pull') || nameLower.includes('invertido') || nameLower.includes('rear');

  // AI insights specific to each exercise or muscle group
  const getAIInsights = () => {
    switch (exercise.muscleGroup) {
      case 'Pecho':
        return {
          primaryActivation: isUpper ? 'Pectoral Mayor - Haz Clavicular (96%)' : isLower ? 'Pectoral Mayor - Haz Costal (94%)' : 'Pectoral Mayor - Sternal/Medio (94%)',
          synergists: 'Deltoides Anterior, Tríceps Braquial, Serrato',
          tempo: '3-1-1-0 (3s excéntrico lento, 1s pausa inferior, 1s explosivo)',
          tips: [
            isUpper 
              ? 'Mantén un ángulo de banco de 30° para enfocar el esfuerzo en la porción clavicular sin sobrecargar los hombros frontales.'
              : isFly
              ? 'Imagina abrazar un gran barril. No flexiones demasiado los codos para no convertir el movimiento en un press.'
              : 'Mantén una retracción escapular activa constante (hombros atrás y abajo) para maximizar el estiramiento del pecho.',
            'Evita rebotar la barra en el pecho; baja controlado controlando el tempo de contracción.',
            'Asegura que los antebrazos se mantengan perfectamente verticales al suelo durante la porción más baja de la repetición.'
          ],
          idealAngle: isUpper ? '30° de inclinación óptima' : isFly ? 'Arco de contracción amplio' : '90° de flexión en el codo'
        };
      case 'Espalda':
        return {
          primaryActivation: isDeadlift ? 'Erectores de la Columna y Glúteo (95%)' : isRow ? 'Dorsal Ancho y Trapecio Medio (92%)' : 'Dorsal Ancho - Porción Iliaca (93%)',
          synergists: isDeadlift ? 'Isquiotibiales, Trapecios, Core' : 'Bíceps Braquial, Redondo Mayor, Deltoides Posterior',
          tempo: isDeadlift ? '2-1-2-0 (Tracción controlada con bisagra de cadera limpia)' : '2-0-2-1 (2s extensión excéntrica, 1s parada isométrica)',
          tips: [
            isDeadlift 
              ? 'Empuja la cadera hacia atrás para iniciar la bisagra. Mantén la barra pegada a tus piernas en todo momento.'
              : isRow
              ? 'Tira del peso llevando los codos hacia la cadera, no hacia los hombros, para evitar activar en exceso los trapecios superiores.'
              : 'Inicia cada tirón descendiendo activamente las escápulas. Imagina que los brazos son solo ganchos transmisores.',
            'Evita balancear el torso superior; la estabilidad del core protege tus lumbares de giros nocivos.',
            'Exprime los omóplatos al final del rango para una contracción máxima en la parte media.'
          ],
          idealAngle: isDeadlift ? 'Ángulo neutro de columna lumbar' : 'Extensión escapular de 30°'
        };
      case 'Hombros':
        return {
          primaryActivation: isLateral ? 'Deltoides Medio (95%)' : isRearDelt ? 'Deltoides Posterior (93%)' : 'Deltoides Anterior (92%)',
          synergists: 'Tríceps Braquial, Trapecio Superior, Serrato Anterior',
          tempo: '3-0-1-1 (3s descenso controlado, 1s elevación, 1s pico arriba)',
          tips: [
            isLateral 
              ? 'No eleves las manos por encima de la línea de los hombros. Inclina ligeramente el torso hacia el frente (15°) para aislar el deltoides medio.'
              : isRearDelt
              ? 'Asegúrate de tirar apuntando con los codos hacia afuera para enfocar el deltoides posterior, evitando juntar los omóplatos.'
              : 'Realiza el press militar en el plano de la escápula (codos ligeramente metidos hacia el frente a 30°), reduciendo la fricción articular.',
            'Mantén el cuello relajado y evita encoger los hombros excesivamente para no sobrecargar el trapecio superior.'
          ],
          idealAngle: '30° en el Plano Escapular'
        };
      case 'Brazos':
        return {
          primaryActivation: isTricep ? 'Tríceps Braquial - Cabeza Larga/Lateral (95%)' : 'Bíceps Braquial - Cabeza Corta/Larga (94%)',
          synergists: isTricep ? 'Ancóneo, Deltoides Anterior' : 'Braquial Anterior, Braquiorradial',
          tempo: '3-0-2-1 (3s fase negativa lenta, 1s máxima contracción arriba)',
          tips: [
            isTricep 
              ? 'Mantén los codos completamente fijos y pegados a los costados. No dejes que se abran ni se muevan hacia adelante.'
              : 'Evita columpiar los hombros o el torso para subir el peso. Los codos deben actuar estrictamente como bisagras fijas.',
            'Busca el rango de movimiento completo: estira por completo el músculo abajo antes de iniciar la siguiente fase concéntrica.'
          ],
          idealAngle: 'Flexo-extensión pura de codo a 180°'
        };
      case 'Piernas':
        return {
          primaryActivation: isCalf ? 'Gastrocnemio (Cabeza Interna y Externa) y Sóleo (96%)' : isGlute ? 'Glúteo Mayor y Medio (94%)' : 'Cuádriceps Femoris / Glúteo (91%)',
          synergists: isCalf ? 'Plantar Delgado, Tendón de Aquiles' : 'Isquiotibiales, Abductores, Core',
          tempo: isCalf ? '2-2-1-2 (2s excéntrico lento, 2s de estiramiento pasivo abajo, 1s elevación explosiva, 2s contracción)' : '3-1-1-0 (3s bajada profunda controlando el descenso, 1s pausa de control)',
          tips: [
            isCalf 
              ? 'Mantén una pausa de 2 segundos en el punto más bajo (estiramiento máximo) para disipar el rebote elástico del tendón de Aquiles y maximizar la hipertrofia.'
              : isGlute
              ? 'Consigue una retroversión pélvica ligera al final de la extensión de cadera para activar al máximo las fibras glúteas superiores.'
              : 'Asegúrate de que las rodillas viajen alineadas en todo momento con la punta de tus pies, impidiendo el valgo dinámico.',
            isCalf
              ? 'Presiona uniformemente sobre la almohadilla del pie (metatarsos), enfocándote en empujar a través del primer y segundo dedo para evitar la supinación del tobillo.'
              : 'Mantén los talones firmemente apoyados en el suelo o plataforma. Empuja con el centro del pie.',
            isCalf
              ? 'Para enfatizar el gastrocnemio (gemelo superior), mantén las rodillas bloqueadas o con una micro-flexión fija. Flexionar las rodillas a 90° aísla casi por completo el sóleo.'
              : 'Activa el transverso abdominal para mantener el torso rígido como un bloque protector de la columna.'
          ],
          idealAngle: isCalf ? '30° a 45° de flexión plantar pura' : '90° a 110° de flexión'
        };
      case 'Cuello':
        return {
          primaryActivation: 'Músculos del cuello y elevador de la escápula',
          synergists: 'Trapecio superior, Esternocleidomastoideo',
          tempo: '3-2-3-0 (movimiento lento y sin rebotes)',
          tips: [
            'Mueve el cuello despacio y sin forzar el final del recorrido; deja de hacerlo si notas pinchazos o mareo.',
            'Mantén los hombros relajados y alejados de las orejas durante todo el ejercicio.'
          ],
          idealAngle: 'Rango cómodo, sin dolor'
        };
      case 'Cuerpo completo':
        return {
          primaryActivation: 'Trabajo global: piernas, tronco y brazos',
          synergists: 'Core, Glúteos, Cuádriceps, Hombros',
          tempo: '2-0-1-0 (ritmo controlado y continuo)',
          tips: [
            'Mantén el core firme durante todo el movimiento para transferir la fuerza entre tren inferior y superior.',
            'Prioriza la técnica sobre la velocidad: si se pierde la postura, reduce el ritmo o el peso.'
          ],
          idealAngle: 'Columna neutra durante todo el movimiento'
        };
      case 'Cardio':
        return {
          primaryActivation: 'Sistema cardiovascular',
          synergists: 'Piernas, Core',
          tempo: 'Ritmo constante y sostenible',
          tips: [
            'Mantén una respiración rítmica y un ritmo que te permita sostener el esfuerzo.',
            'Calienta antes de aumentar la intensidad y vuelve a la calma al terminar.'
          ],
          idealAngle: 'Postura erguida y relajada'
        };
      default:
        return {
          primaryActivation: 'Core - Recto Abdominal y Oblicuos (88%)',
          synergists: 'Transverso, Flexores de Cadera, Serrato',
          tempo: '2-1-2-1 (Control isométrico estricto de la contracción)',
          tips: [
            'No tires del cuello con las manos. Los brazos sirven únicamente para dar un soporte cómodo a la cabeza.',
            'Exhala con fuerza en el punto álgido de la contracción abdominal para lograr una contracción del transverso profundo.',
            'Mantén el rango lento y enfocado, eliminando todo impulso inercial de la parte inferior.'
          ],
          idealAngle: '30° de flexión torácica'
        };
    }
  };

  const baseInsights = getAIInsights();
  // El catálogo importado trae los músculos secundarios reales de cada ejercicio.
  const insights =
    exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0
      ? { ...baseInsights, synergists: exercise.secondaryMuscles.join(', ') }
      : baseInsights;


  return (
    <div id="exercise-ai-visualizer" className="bg-slate-950/85 border border-slate-800 rounded-2xl overflow-hidden shadow-inner flex flex-col h-full min-h-[300px]">
      {/* Top Banner AI status */}
      <div className="bg-slate-900/60 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-1.5 text-blue-400">
          <Brain className="h-3.5 w-3.5 animate-pulse" />
          <span>SISTEMA DE ANATOMÍA BIOMÉTRICA v4.0</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          </div>
          <span>ALTA RESOLUCIÓN</span>
        </div>
      </div>

      {/* Tabs for Anatomy and Insights */}
      <div className="flex border-b border-slate-800/80 text-xs">
        <button
          onClick={() => setActiveTab('anatomy')}
          className={`flex-1 py-2.5 font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'anatomy' 
              ? 'border-blue-500 text-blue-400 bg-slate-900/20' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          Escáner Anatomía HD
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex-1 py-2.5 font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'insights' 
              ? 'border-blue-500 text-blue-400 bg-slate-900/20' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Métricas de Carga
        </button>
      </div>

      <div className="flex-grow p-4 flex flex-col justify-between min-h-0 bg-slate-950 relative">
        {/* Holographic grid scan line overlay */}
        {scanActive && activeTab === 'anatomy' && (
          <motion.div 
            className="absolute left-0 right-0 h-0.5 bg-blue-500/50 shadow-[0_0_12px_#38bdf8] z-10 pointer-events-none"
            animate={{ 
              top: ['5%', '95%', '5%'] 
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: 'linear' 
            }}
          />
        )}

        {activeTab === 'anatomy' ? (
          <div className="flex flex-col h-full justify-between gap-4">
            {/* Anatomy Visualizer container */}
            <div className="flex-grow flex items-center justify-center h-48 relative bg-slate-900/20 rounded-xl border border-slate-900 p-2 overflow-hidden">
              <MuscleZoneImage zone={zone} className="w-full h-full object-contain" />
            </div>

            {/* Quick biometric metrics */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-slate-900 pt-3">
              <div className="bg-slate-900/40 border border-slate-900 p-2 rounded-lg">
                <span className="text-slate-500 block text-[9px]">MÚSCULO PRINCIPAL</span>
                <span className="text-blue-400 font-bold block mt-0.5 truncate">{insights.primaryActivation}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-900 p-2 rounded-lg">
                <span className="text-slate-500 block text-[9px]">MÚSCULOS SINERGISTAS</span>
                <span className="text-slate-300 font-medium block mt-0.5 truncate">{insights.synergists}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 h-full flex flex-col justify-between">
            {/* Load metrics / Insights Panel */}
            <div className="space-y-2.5 overflow-y-auto max-h-48 text-xs text-slate-300 leading-relaxed pr-1">
              <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl">
                <Zap className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 font-mono block">CADENCIA RECOMENDADA DE IA</span>
                  <span className="font-bold text-slate-200 font-mono text-xs">{insights.tempo}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl">
                <Activity className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 font-mono block">RANGO DE MOVIMIENTO RECOMENDADO</span>
                  <span className="font-semibold text-slate-200 font-mono text-xs">{insights.idealAngle}</span>
                </div>
              </div>

              <div className="bg-slate-900/20 border border-slate-900 p-3 rounded-xl space-y-2">
                <span className="text-[10px] text-slate-500 font-mono block flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 text-red-400" /> CORRECCIÓN TÉCNICA DE IA
                </span>
                <p className="text-xs text-slate-400 italic">
                  "{insights.tips[0]}"
                </p>
              </div>
            </div>

            {/* Simulated Live wave */}
            <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-2.5 flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-500">M-ECG</span>
              <div className="flex-grow h-6 flex items-end gap-0.5 overflow-hidden">
                {[...Array(24)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 bg-blue-500/60 rounded-full"
                    animate={{ 
                      height: [
                        '20%', 
                        `${Math.floor(Math.sin(i / 2 + Date.now() / 300) * 40 + 50)}%`, 
                        '20%'
                      ] 
                    }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      ease: 'easeInOut',
                      delay: i * 0.04 
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
