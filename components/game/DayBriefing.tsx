"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { DayBriefing as DayBriefingContent } from '@/lib/game-state';

export interface DayBriefingProps {
  day: number;
  briefing: DayBriefingContent | null;
  disabled?: boolean;
  onConfirm: () => void;
}

export function DayBriefing({ day, briefing, disabled = false, onConfirm }: DayBriefingProps) {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  const getStampColor = (level: DayBriefingContent['classification_level']) => {
    switch (level) {
      case "CONFIDENCIAL":
        return "text-red-500 border-red-500/80";
      case "USO INTERNO":
        return "text-orange-500 border-orange-500/80";
      default:
        return "text-slate-400 border-slate-500/80";
    }
  };

  if (!briefing) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/95 p-4 font-mono text-slate-300">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.95),_rgba(2,6,23,1))]"
          />
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="relative max-w-3xl w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/95 p-8 shadow-2xl shadow-black/50"
          >
            <motion.div variants={item} className="mb-6 text-center">
              <h1 className="text-xl md:text-2xl font-bold tracking-widest text-slate-100 uppercase">
                Aeropuerto Internacional Levante
              </h1>
              <p className="mt-2 text-sm tracking-[0.35em] text-slate-500 uppercase">
                Informe operativo · Día {day}
              </p>
            </motion.div>

            <motion.div variants={item} className="my-6 border-t border-dashed border-slate-700" />

            <motion.div variants={item} className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.35em] text-slate-500">Circular de vigilancia</p>
                <h2 className="text-xl font-bold text-slate-100 md:text-2xl">
                  {briefing.alert_title}
                </h2>
              </div>
              <div
                className={`w-max border-2 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] rotate-2 ${getStampColor(
                  briefing.classification_level
                )}`}
                style={{ mixBlendMode: 'screen' }}
              >
                {briefing.classification_level}
              </div>
            </motion.div>

            <motion.div variants={item} className="mb-8">
              <p className="whitespace-pre-line leading-relaxed text-slate-300">
                {briefing.alert_body}
              </p>
            </motion.div>

            {briefing.watch_for.length > 0 ? (
              <motion.div variants={item} className="mb-10 rounded border border-slate-800/80 bg-slate-900/60 p-6">
                <h3 className="mb-4 border-b border-slate-800 pb-2 text-sm uppercase tracking-[0.35em] text-slate-400">
                  Watch for
                </h3>
                <ul className="space-y-3 text-slate-200">
                  {briefing.watch_for.map((watchItem, index) => (
                    <motion.li key={`${watchItem}-${index}`} variants={item} className="flex items-start gap-3">
                      <span className="mt-0.5 text-xs text-cyan-400">►</span>
                      <span>{watchItem}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ) : null}

            <div className="flex min-h-16 items-end justify-center">
              {showButton ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-center text-xs uppercase tracking-[0.25em] text-slate-500">
                    Al abrir el turno verás el primer expediente y podrás empezar a preguntar.
                  </p>
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={onConfirm}
                    disabled={disabled}
                    className="rounded border border-cyan-700/50 bg-cyan-950/50 px-8 py-3 text-sm font-bold uppercase tracking-[0.3em] text-cyan-300 transition-colors hover:bg-cyan-900/70 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ABRIR TURNO
                  </motion.button>
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
    </AnimatePresence>
  );
}
