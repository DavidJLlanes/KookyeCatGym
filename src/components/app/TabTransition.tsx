import { ReactNode } from 'react';
import { motion } from 'motion/react';

/** Animación de entrada/salida común a todas las pestañas. */
export default function TabTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
     
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
