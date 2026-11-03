import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderPlus, X } from 'lucide-react';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

/** Creación rápida de una carpeta desde la cabecera del listado de rutinas. */
export default function NewFolderModal({ isOpen, onClose, onCreate }: NewFolderModalProps) {
  const [newFolderName, setNewFolderName] = useState('');
  const close = () => {
    setNewFolderName('');
    onClose();
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    onCreate(name);
    close();
  };
  return (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-900 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-800"
        >
          <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-blue-400 shrink-0" />
              Nueva Carpeta
            </h3>
            <button
              type="button"
              onClick={close}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={submit} className="p-4 sm:p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Nombre de la Carpeta
              </label>
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ej. Fuerza, Verano 2026..."
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-650"
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Se creará la carpeta y se abrirá el formulario para añadir tu primera rutina dentro de ella.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={close}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!newFolderName.trim()}
                className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-900 disabled:text-slate-650 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                Crear Carpeta
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );
}
