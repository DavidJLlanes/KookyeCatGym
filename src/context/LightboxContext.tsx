import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

interface LightboxContextValue {
  // video: si el ejercicio tiene vídeo, se reproduce en bucle en lugar de la imagen.
  openLightbox: (src: string, alt?: string, video?: string) => void;
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

export function useLightbox() {
  const ctx = useContext(LightboxContext);
  if (!ctx) throw new Error('useLightbox debe usarse dentro de LightboxProvider');
  return ctx;
}

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<{ src: string; alt: string; video?: string } | null>(null);

  const openLightbox = (src: string, alt = '', video?: string) => setImage({ src, alt, video });
  const close = () => setImage(null);

  return (
    <LightboxContext.Provider value={{ openLightbox }}>
      {children}
      <AnimatePresence>
        {image && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            onClick={close}
            className="fixed inset-0 bg-slate-950/95 z-[200] flex items-center justify-center p-6 cursor-zoom-out"
          >
            {image.video ? (
              <motion.video
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 300 } }}
                exit={{ scale: 0.96, opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } }}
                src={image.video}
                poster={image.src}
                aria-label={image.alt}
                autoPlay
                loop
                muted
                playsInline
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl cursor-default bg-white"
              />
            ) : (
              <motion.img
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 300 } }}
                exit={{ scale: 0.96, opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } }}
                src={image.src}
                alt={image.alt}
                referrerPolicy="no-referrer"
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl cursor-default"
              />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              title="Cerrar"
              aria-label="Cerrar imagen"
              style={{
                top: 'calc(1.25rem + env(safe-area-inset-top))',
                right: 'calc(1.25rem + env(safe-area-inset-right))',
                touchAction: 'manipulation',
              }}
              className="absolute p-3 bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 text-white rounded-full transition-colors cursor-pointer border border-slate-700 shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </LightboxContext.Provider>
  );
}
