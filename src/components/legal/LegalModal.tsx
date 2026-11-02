import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, ShieldCheck, ScrollText } from 'lucide-react';
import { LEGAL_DOCUMENTS, LegalPage } from './legalContent';
import ScrollRow from '../ScrollRow';

interface LegalModalProps {
  activePage: LegalPage | null;
  onSelectPage: (page: LegalPage) => void;
  onClose: () => void;
}

const TABS: { page: LegalPage; label: string; icon: typeof FileText }[] = [
  { page: 'aviso', label: 'Aviso Legal', icon: FileText },
  { page: 'privacidad', label: 'Privacidad', icon: ShieldCheck },
  { page: 'terminos', label: 'Términos', icon: ScrollText },
];

export default function LegalModal({ activePage, onSelectPage, onClose }: LegalModalProps) {
  const doc = activePage ? LEGAL_DOCUMENTS[activePage] : null;

  return (
    <AnimatePresence>
      {doc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-900 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-800 max-h-[88dvh] flex flex-col"
          >
            {/* Cabecera con pestañas para cambiar de documento sin cerrar el modal */}
            <div className="bg-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-center justify-between p-3.5 sm:p-4">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate pr-2">{doc.title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ScrollRow fadeFrom="from-slate-900" className="pb-3" scrollerClassName="flex gap-1.5 px-3.5 sm:px-4" scrollerProps={{ role: 'tablist' }}>
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = tab.page === activePage;
                  return (
                    <button
                      key={tab.page}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => onSelectPage(tab.page)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {tab.label}
                    </button>
                  );
                })}
              </ScrollRow>
            </div>

            {/* Contenido del documento */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-900">
              {doc.sections.map((section) => (
                <div key={section.heading} className="space-y-2">
                  <h4 className="text-sm font-extrabold text-slate-200">{section.heading}</h4>
                  {section.paragraphs.map((p, idx) => (
                    <p key={idx} className="text-xs sm:text-[13px] text-slate-400 leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              ))}
              <p className="text-[11px] text-slate-600 pt-3 border-t border-slate-800/70">
                Última actualización: {doc.lastUpdated}
              </p>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-md shadow-blue-500/10"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
