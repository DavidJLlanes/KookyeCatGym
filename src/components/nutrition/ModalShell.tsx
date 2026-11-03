import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalShellProps {
  isOpen: boolean;
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Ventana modal común a la pestaña de nutrición. */
export default function ModalShell({ isOpen, title, icon, onClose, children, footer }: ModalShellProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            role="dialog"
            aria-label={title}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
          >
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 min-w-0">
                {icon}
                <span className="truncate">{title}</span>
              </h3>
              <button type="button" onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 cursor-pointer shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">{children}</div>
            {footer && <div className="p-4 bg-slate-950 border-t border-slate-800">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
