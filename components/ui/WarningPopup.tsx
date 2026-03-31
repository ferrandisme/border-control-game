"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function WarningPopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasDismissed = localStorage.getItem("border-control-warning-dismissed");
    if (!hasDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("border-control-warning-dismissed", "true");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm sm:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-cyan-500/30 bg-terminal-surface shadow-neon-cyan"
          >
            <div className="flex items-center gap-3 border-b border-cyan-500/20 bg-cyan-950/30 px-6 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,104v40a8,8,0,0,0,16,0V104a8,8,0,0,0-16,0Zm20,88a12,12,0,1,1-12-12A12,12,0,0,1,140,192Z"></path>
                </svg>
              </div>
              <h2 className="font-mono text-lg font-bold uppercase tracking-widest text-cyan-100">
                Aviso de Sistema
              </h2>
            </div>
            
            <div className="space-y-4 px-6 py-6 font-mono text-sm leading-relaxed text-slate-300">
              <p>
                <strong className="text-cyan-400">Estado de Acceso:</strong> Esta es una versión experimental desarrollada para una hackathon.
              </p>
              <p>
                <strong className="text-amber-400">Limitaciones de Red:</strong> Los servicios de IA operan bajo cuotas gratuitas. Podrían experimentar latencia, interrupciones o fallos de conexión.
              </p>
              <p>
                <strong className="text-red-400">Privacidad y Seguridad:</strong> El sistema procesa texto mediante APIs externas. Aunque se aplican configuraciones de privacidad, los proveedores podrían procesar datos en función de sus políticas.
              </p>
              <p className="border-l-2 border-red-500/50 bg-red-950/20 py-2 pl-3 text-red-200">
                NO PROPORCIONES NI COMPARTAS DATOS SENSIBLES O PERSONALES.
              </p>
            </div>

            <div className="border-t border-cyan-500/20 bg-slate-900/50 px-6 py-4">
              <button
                onClick={handleDismiss}
                className="w-full rounded-lg border border-cyan-600 bg-cyan-950/50 px-4 py-3 font-mono text-sm font-bold uppercase tracking-widest text-cyan-200 transition-all hover:bg-cyan-900/80 hover:text-white"
              >
                Entendido, acceder
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
