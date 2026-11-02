import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { X, FileDown, Printer, FileUp, Check, AlertCircle } from 'lucide-react';
import type { Exercise, Routine } from '../types';
import { buildPlanFile, buildPrintableHtml, parsePlanFile } from '../utils/planShare';

interface SharePlanModalProps {
  routines: Routine[];
  exercises: Exercise[];
  onImport: (routines: Routine[]) => void;
  onClose: () => void;
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Imprime un HTML con el diálogo del navegador (desde ahí se guarda como PDF). */
function printHtml(html: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const win = frame.contentWindow;
  const run = () => {
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 2000);
  };
  // Da un momento a que el navegador pinte el documento
  setTimeout(run, 250);
  return true;
}

export default function SharePlanModal({ routines, exercises, onImport, onClose }: SharePlanModalProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(routines.map((r) => r.id)));
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const chosen = useMemo(() => routines.filter((r) => selected.has(r.id)), [routines, selected]);
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const saveFile = () => {
    if (chosen.length === 0) return;
    const file = buildPlanFile(chosen, exercises);
    download(`plan-${new Date().toISOString().slice(0, 10)}.zgym-plan.json`, JSON.stringify(file, null, 2), 'application/json');
    setMessage({ kind: 'ok', text: `Guardado el plan con ${chosen.length} ${chosen.length === 1 ? 'rutina' : 'rutinas'}. Se lo puedes pasar a quien quieras para que lo importe.` });
  };

  const print = () => {
    if (chosen.length === 0) return;
    const ok = printHtml(buildPrintableHtml(chosen, exercises, chosen.length === 1 ? chosen[0].name : 'Mi plan de entrenamiento'));
    setMessage(ok ? { kind: 'ok', text: 'En el diálogo de impresión, elige «Guardar como PDF» como destino si quieres un PDF.' } : { kind: 'error', text: 'No se pudo abrir la impresión en este navegador.' });
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 2_000_000) return setMessage({ kind: 'error', text: 'El archivo es demasiado grande para ser un plan.' });
    const result = parsePlanFile(await file.text(), exercises);
    if (result.error) return setMessage({ kind: 'error', text: result.error });
    onImport(result.routines);
    setMessage({
      kind: 'ok',
      text: `Importadas ${result.routines.length} ${result.routines.length === 1 ? 'rutina' : 'rutinas'}.${result.missing.length > 0 ? ` No se encontraron estos ejercicios y se omitieron: ${result.missing.slice(0, 5).join(', ')}${result.missing.length > 5 ? '…' : ''}.` : ''}`,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Compartir o importar un plan">
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full sm:max-w-lg max-h-[92dvh] flex flex-col bg-slate-900 border border-slate-800 sm:rounded-3xl rounded-t-3xl shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
          <h3 className="font-black text-white">Compartir o importar un plan</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {message && (
            <div role={message.kind === 'error' ? 'alert' : 'status'} className={`p-3 rounded-xl border text-xs flex gap-2 ${message.kind === 'ok' ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-red-950/30 border-red-500/30 text-red-300'}`}>
              {message.kind === 'ok' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              {message.text}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rutinas a compartir</div>
              <button type="button" onClick={() => setSelected(selected.size === routines.length ? new Set() : new Set(routines.map((r) => r.id)))} className="text-xs font-bold text-blue-400 hover:text-blue-300 cursor-pointer">
                {selected.size === routines.length ? 'Quitar todas' : 'Marcar todas'}
              </button>
            </div>
            {routines.length === 0 && <p className="text-xs text-slate-500">Aún no tienes rutinas que compartir.</p>}
            <ul className="max-h-56 overflow-y-auto space-y-1">
              {routines.map((r) => (
                <li key={r.id}>
                  <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 cursor-pointer text-sm text-slate-200">
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 accent-blue-500" />
                    <span className="flex-1 min-w-0 truncate">{r.name}</span>
                    <span className="text-[11px] text-slate-500 shrink-0">{[r.folder, `${r.exercises.length} ejerc.`].filter(Boolean).join(' · ')}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={saveFile} disabled={chosen.length === 0} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold cursor-pointer">
                <FileDown className="h-4 w-4" /> Guardar archivo
              </button>
              <button type="button" onClick={print} disabled={chosen.length === 0} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer">
                <Printer className="h-4 w-4" /> Imprimir / PDF
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-800">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Importar un plan</div>
            <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-300 cursor-pointer transition-colors">
              <FileUp className="h-4 w-4 text-blue-400" />
              Elegir un archivo de plan (.zgym-plan.json)
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  void importFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
            <p className="text-[11px] text-slate-500">Las rutinas importadas se añaden como nuevas; no se toca ninguna de las tuyas.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
