import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, Check, Lock } from 'lucide-react';
import { useLegal } from '../../context/LegalContext';

export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  timestamp: string;
  version: number;
}

const STORAGE_KEY = 'kookyecatgym_cookie_consent';
const CONSENT_VERSION = 1;

export function loadCookieConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCookieConsent(analytics: boolean): CookieConsent {
  const consent: CookieConsent = {
    necessary: true,
    analytics,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  return consent;
}

interface CookieBannerProps {
  visible: boolean;
  startExpanded: boolean;
  initialAnalytics: boolean;
  onResolved: (consent: CookieConsent) => void;
}

export default function CookieBanner({ visible, startExpanded, initialAnalytics, onResolved }: CookieBannerProps) {
  const { openLegal } = useLegal();
  const [expanded, setExpanded] = useState(startExpanded);
  const [analyticsChoice, setAnalyticsChoice] = useState(initialAnalytics);

  React.useEffect(() => {
    setExpanded(startExpanded);
    setAnalyticsChoice(initialAnalytics);
  }, [startExpanded, initialAnalytics, visible]);

  const acceptAll = () => onResolved(saveCookieConsent(true));
  const rejectAll = () => onResolved(saveCookieConsent(false));
  const savePreferences = () => onResolved(saveCookieConsent(analyticsChoice));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="fixed inset-x-0 bottom-0 z-[110] p-2.5 sm:p-4"
          style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))', paddingLeft: 'max(0.625rem, env(safe-area-inset-left))', paddingRight: 'max(0.625rem, env(safe-area-inset-right))' }}
          role="dialog"
          aria-label="Uso de cookies y almacenamiento local"
        >
          <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70dvh]">
            {/* Contenido desplazable: nunca empuja ni recorta los botones de acción de abajo */}
            <div className="overflow-y-auto">
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Cookie className="h-4 w-4 text-blue-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-100 leading-tight">Cookies y almacenamiento local</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Usamos almacenamiento estrictamente necesario para que KookyeCatGym funcione (tu sesión y tu entrenamiento activo). Con tu
                  permiso, en el futuro podríamos usar cookies analíticas. Más información en nuestra{' '}
                  <button
                    type="button"
                    onClick={() => openLegal('privacidad')}
                    className="underline text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    Política de Privacidad
                  </button>
                  .
                </p>
              </div>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-5 pb-2 space-y-2.5 border-t border-slate-800/70 pt-4">
                      <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Lock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-200">Necesarias</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Imprescindibles para el funcionamiento de la app. Siempre activas.
                          </p>
                        </div>
                        <div className="h-6 w-11 rounded-full bg-blue-600/40 border border-blue-500/30 flex items-center px-0.5 shrink-0 cursor-not-allowed">
                          <div className="h-5 w-5 rounded-full bg-blue-400 ml-auto flex items-center justify-center">
                            <Check className="h-3 w-3 text-slate-950" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-3">
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-200">Analíticas</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Actualmente no se utilizan. Si se activan en el futuro, nos ayudarán a entender el uso de la
                            app para mejorarla.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAnalyticsChoice((v) => !v)}
                          aria-pressed={analyticsChoice}
                          className={`h-6 w-11 rounded-full border flex items-center px-0.5 shrink-0 cursor-pointer transition-colors ${
                            analyticsChoice ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700'
                          }`}
                        >
                          <div
                            className={`h-5 w-5 rounded-full bg-white transition-transform ${
                              analyticsChoice ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-3 sm:p-4 grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:justify-end shrink-0 border-t border-slate-800/70">
              {!expanded && (
                <button type="button" onClick={() => setExpanded(true)} className="btn btn-ghost btn-sm col-span-2 sm:col-span-1 sm:order-1">
                  Personalizar
                </button>
              )}
              <button type="button" onClick={rejectAll} className="btn btn-secondary sm:order-2">
                Rechazar todas
              </button>
              {expanded ? (
                <button type="button" onClick={savePreferences} className="btn btn-primary sm:order-3">
                  Guardar preferencias
                </button>
              ) : (
                <button type="button" onClick={acceptAll} className="btn btn-primary sm:order-3">
                  Aceptar todas
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
