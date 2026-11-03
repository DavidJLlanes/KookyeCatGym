import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Upload, X } from 'lucide-react';
import { Exercise } from '../../types';
import ImportPanel from '../ImportPanel';
import PasskeySection from '../PasskeySection';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  existingLogIds: Set<string>;
  hasLogs: boolean;
  hasBodyWeights: boolean;
  onExportJson: () => void;
  onExportWorkoutsCsv: () => void;
  onExportBodyCsv: () => void;
  /** Restaura una copia JSON; devuelve true si se aplicó (entonces se vacía el cuadro). */
  onRestoreJson: (json: string) => boolean;
  onImportWorkouts: React.ComponentProps<typeof ImportPanel>['onImport'];
}

/** Copia de seguridad, exportación a CSV, restauración e importación desde otras apps. */
export default function BackupModal({
  isOpen, onClose, exercises, existingLogIds, hasLogs, hasBodyWeights,
  onExportJson, onExportWorkoutsCsv, onExportBodyCsv, onRestoreJson, onImportWorkouts,
}: BackupModalProps) {
  const [backupJson, setBackupJson] = useState('');
  const handleRestore = (e: React.FormEvent) => {
    e.preventDefault();
    if (onRestoreJson(backupJson)) setBackupJson('');
  };
  return (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto shadow-2xl border border-slate-800 p-6 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-400" />
              Copia de Seguridad y Restauración
            </h3>
            <button
              onClick={() => onClose()}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Exporta todo tu historial de entrenamiento, tus rutinas personalizadas y tus ejercicios de forma offline a un archivo JSON. Puedes restaurarlos en cualquier momento o importarlos en otro dispositivo.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onExportJson}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Download className="h-4.5 w-4.5" />
              Exportar JSON
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Hoja de cálculo (CSV)</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Un archivo que se abre con doble clic en Excel o LibreOffice: una fila por serie, o tus pesajes corporales.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onExportWorkoutsCsv}
                disabled={!hasLogs}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
              >
                <Download className="h-4 w-4" />
                Entrenamientos
              </button>
              <button
                type="button"
                onClick={onExportBodyCsv}
                disabled={!hasBodyWeights}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
              >
                <Download className="h-4 w-4" />
                Peso corporal
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-5 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-emerald-400" />
              Restaurar Datos
            </div>

            <form onSubmit={handleRestore} className="space-y-3">
              <textarea
                rows={4}
                required
                value={backupJson}
                onChange={(e) => setBackupJson(e.target.value)}
                placeholder="Pega aquí el contenido del archivo de copia de seguridad JSON..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!backupJson.trim()}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
              >
                Restaurar e Importar Copia de Seguridad
              </button>
            </form>
          </div>

          <div className="border-t border-slate-800 pt-5 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-amber-400" />
              Importar desde otra app
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trae tu historial de Hevy, Strong o FitNotes. Exporta tus datos en CSV desde esa app y elige el archivo aquí.
            </p>
            <ImportPanel
              exercises={exercises}
              existingLogIds={existingLogIds}
              onImport={onImportWorkouts}
            />
          </div>

          <PasskeySection />
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );
}
