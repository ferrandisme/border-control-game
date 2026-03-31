"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface LoadingScreenProps {
  title?: string;
  detail?: string;
  progress: number;
  maxProgress?: number;
  currentStep: string;
  active: boolean;
  waiting?: boolean;
}

export function LoadingScreen({
  title = "SISTEMA INICIADO",
  detail,
  progress,
  maxProgress,
  currentStep,
  active,
  waiting = false,
}: LoadingScreenProps) {
  const [dots, setDots] = useState('');
  const [displayProgress, setDisplayProgress] = useState(0);
  const [showDelayedWarning, setShowDelayedWarning] = useState(false);

  useEffect(() => {
    let timeout: number;
    if (active && waiting) {
      timeout = window.setTimeout(() => {
        setShowDelayedWarning(true);
      }, 15000);
    } else {
      setShowDelayedWarning(false);
    }

    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [active, waiting]);

  useEffect(() => {
    if (!active) return;

    const interval = window.setInterval(() => {
      setDisplayProgress((current) => {
        const boundedCurrent = Math.max(current, progress);

        if (!waiting) {
          return boundedCurrent;
        }

        const ceiling = Math.max(progress, maxProgress ?? progress);
        if (boundedCurrent >= ceiling) {
          return ceiling;
        }

        const remaining = ceiling - boundedCurrent;
        const step = Math.max(remaining * 0.12, 0.35);
        return Math.min(ceiling, boundedCurrent + step);
      });
    }, 120);

    return () => window.clearInterval(interval);
  }, [active, maxProgress, progress, waiting]);

  useEffect(() => {
    if (!waiting) return;
    
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 700);
    
    return () => clearInterval(interval);
  }, [waiting]);

  if (!active) return null;

  const displayDots = waiting ? dots : '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-full min-h-[400px] w-full flex-col items-center justify-center overflow-hidden rounded-none border border-cyan-500/30 bg-[#030a14]/90 p-8 text-slate-400 shadow-neon-cyan"
    >
      {/* Decorative background grid/lines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(slate-500 1px, transparent 1px), linear-gradient(90deg, slate-500 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="pointer-events-none absolute inset-0 m-1 border-[1px] border-cyan-500/10" />

      {/* Main Content Container */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 text-center scanline">
        
        {/* Animated Icon */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.5, 0.8, 0.5] 
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="absolute inset-0 rounded-none bg-cyan-900/20 blur-xl"
          />
          <svg
            className="h-16 w-16 text-cyan-500/80 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            <motion.path 
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              d="M9 14h6" 
            />
            <motion.path 
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, ease: "linear" }}
              d="M9 10h6" 
            />
          </svg>
        </div>

        {/* Text Details */}
        <div className="flex flex-col gap-2">
          {title && (
            <h2 className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-cyan-400">
              {title}
            </h2>
          )}
          {detail && (
                <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
                  {detail}
                </p>
          )}
          {showDelayedWarning && (
            <p className="mt-4 font-mono text-xs font-bold uppercase tracking-wider text-amber-500 animate-pulse">
              Es posible que el provider esté tardando en responder. Mantente a la espera, si no recibimos respuesta pasaremos a otro provider.
            </p>
          )}
        </div>

        {/* Progress Section */}
        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full items-center justify-between px-1">
            <div className="h-4 relative flex-1 overflow-hidden text-left">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={currentStep}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute left-0 font-mono text-xs uppercase tracking-wider text-cyan-100"
                >
                  {currentStep}
                  {waiting && <span className="text-cyan-500 inline-block w-4 text-left font-bold">{displayDots}</span>}
                </motion.span>
              </AnimatePresence>
            </div>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {Math.round(Math.max(displayProgress, progress))}%
              </span>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-1.5 w-full overflow-hidden rounded-none bg-slate-900 border border-cyan-900/50">
            <motion.div
              className="absolute bottom-0 left-0 top-0 bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, Math.min(100, Math.max(displayProgress, progress)))}%` }}
              transition={{ ease: "easeInOut", duration: 1.2 }}
            />
          </div>
        </div>

      </div>

      {/* Footer Text */}
      <div className="absolute bottom-6 left-0 right-0 text-center font-mono">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600/60">
          AEROPUERTO INTERNACIONAL DE LEVANTE // SISTEMA V2.4.1
        </p>
      </div>

    </motion.div>
  );
}
