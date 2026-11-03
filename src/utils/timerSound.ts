// Aviso sonoro y vibración de los temporizadores (descanso y ejercicios por
// tiempo). Sintetizado con la Web Audio API para no depender de archivos.

// Los navegadores limitan a ~6 los AudioContext: se reutiliza uno solo.
let audioCtx: AudioContext | null = null;

function context(): AudioContext {
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

// Un pitido con envolvente suave (evita clics al empezar y parar). Onda
// triangular y volumen alto para que se oiga con música o el móvil en el bolsillo.
function beep(ctx: AudioContext, at: number, frequency: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.9, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
  oscillator.start(at);
  oscillator.stop(at + 0.22);
}

/** Pitidos seguidos (3 = fin de un temporizador, 1 = aviso suave) y vibración donde exista. */
export function playTimerSound(beeps: 1 | 3 = 3, frequency = 880): void {
  try {
    const ctx = context();
    const start = ctx.currentTime;
    for (let i = 0; i < beeps; i++) beep(ctx, start + i * 0.26, frequency);
  } catch (e) {
    console.warn('Audio bloqueado o no disponible', e);
  }
  // Solo Android implementa la Vibration API; en iOS no existe, ni como PWA.
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(beeps === 3 ? [200, 100, 200, 100, 200] : [120]);
    }
  } catch {
    // Algunos navegadores lanzan si se llama sin un gesto reciente del usuario
  }
}
