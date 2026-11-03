import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle} from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl p-6 space-y-5 text-left"
          >
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-xl border shrink-0 ${
                type === 'danger' 
                  ? 'bg-rose-950/40 border-rose-500/25 text-rose-400' 
                  : type === 'warning'
                  ? 'bg-amber-950/40 border-amber-500/25 text-amber-400'
                  : 'bg-blue-950/40 border-blue-500/25 text-blue-400'
              }`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-extrabold text-white leading-tight">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onCancel();
                }}
                className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                  type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-950/20'
                    : type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-950/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
