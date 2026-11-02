import React, { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import { useUserData } from '../context/UserDataContext';
import { formatStack, parseStackInput } from '../utils/weightStack';

/**
 * Pila de pesas de una máquina: los pesos reales que ofrece (aunque salten de 5
 * en 5 o con placas intermedias). La progresión y los botones +/− del
 * entrenamiento se ajustan a ella. Se guarda por ejercicio, no por rutina.
 */
export default function WeightStackEditor({ exerciseId }: { exerciseId: string }) {
  const { data, setValue } = useUserData();
  const stack = data['weight-stacks'][exerciseId];
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => (stack ? formatStack(stack) : ''));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setText(stack ? formatStack(stack) : '');
  }, [stack, open]);

  const save = () => {
    const parsed = parseStackInput(text);
    if (parsed.error) {
      setError(`No entiendo «${parsed.error}». Usa números separados por espacios, o un rango como 5-100/5.`);
      return;
    }
    const next = { ...data['weight-stacks'] };
    if (parsed.stack.length === 0) delete next[exerciseId];
    else next[exerciseId] = parsed.stack;
    setValue('weight-stacks', next);
    setError(null);
    setOpen(false);
  };

  return (
    <div className="space-y-2 pb-2 border-b border-dashed border-slate-800">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <Layers className="h-3.5 w-3.5 text-amber-400" />
        <span>Pila de pesas de la máquina:</span>
        {stack ? <span className="font-bold text-amber-300">{stack.length} pesos ({formatStack([stack[0]])}–{formatStack([stack[stack.length - 1]])} kg)</span> : <span className="text-slate-600">sin definir (opcional)</span>}
        <button type="button" onClick={() => setOpen(!open)} className="font-bold text-blue-400 hover:text-blue-300 cursor-pointer">
          {open ? 'Cerrar' : stack ? 'Editar' : 'Definir'}
        </button>
      </div>
      {open && (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            aria-label="Pesos de la pila"
            placeholder="Ej. 5-100/5   o   10 15 20 25 27,5 30"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg text-xs text-slate-100 placeholder-slate-600 outline-none"
          />
          <p className="text-[11px] text-slate-500">Escribe los pesos que ofrece la máquina, separados por espacios (la coma es el decimal), o un rango «de-a/paso»: 5-100/5 son 5, 10, 15… 100.</p>
          {error && <div role="alert" className="text-xs text-red-400">{error}</div>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setText(''); setError(null); }} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-red-400 cursor-pointer">Vaciar</button>
            <button type="button" onClick={save} className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer">Guardar pila</button>
          </div>
        </div>
      )}
    </div>
  );
}
