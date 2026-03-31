"use client";

import { motion, AnimatePresence } from "framer-motion";

import type { Evidence } from '@/schemas/traveler';
import { Decision } from "@/lib/game-state";
import { DecisionStamp } from '../visuals/DecisionStamp';

export interface ResultRevealProps {
  open: boolean;
  decision: Decision | null;
  actual: Decision | null;
  explanation: string;
  missedIssue?: string | null;
  evidence?: Evidence | null;
  continueLabel?: string;
  onContinue: () => void;
}

export function ResultReveal({ open, decision, actual, explanation, missedIssue, evidence, continueLabel = 'Siguiente Viajero', onContinue }: ResultRevealProps) {
  if (!open || !decision || !actual) return null;

  const isCorrect = decision === actual;
  
  return (
    <AnimatePresence>
      <DecisionStamp key={`decision-stamp-${decision}`} decision={decision} className="fixed inset-0 z-[200] pointer-events-none" />
      <motion.div
        key={`result-overlay-${decision}-${actual}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 1.5, type: "spring", damping: 20, stiffness: 300 }}
          exit={{ scale: 0.9, y: 50 }}
          className="relative max-w-md w-full bg-[#0a1424] border border-cyan-500/30 shadow-neon-cyan rounded-none overflow-hidden flex flex-col"
        >
          <div className="pointer-events-none absolute inset-0 m-1 border-[1px] border-cyan-500/10" />
          <div className={`p-6 text-center border-b relative z-10 ${
            isCorrect ? "bg-emerald-950/30 border-emerald-900/50" : "bg-red-950/30 border-red-900/50"
          }`}>
            <motion.div
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.8, type: "spring", stiffness: 200, damping: 10 }}
              className={`text-6xl font-black uppercase tracking-tighter mx-auto mb-2 w-max px-4 py-2 border-4 rounded-none shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] ${
                isCorrect 
                  ? "text-emerald-500 border-emerald-500/50" 
                  : "text-red-500 border-red-500/50"
              }`}
              style={{
                fontFamily: 'monospace',
                mixBlendMode: 'screen',
                textShadow: '0 0 10px currentColor'
              }}
            >
              {isCorrect ? "CORRECTO" : "INCORRECTO"}
            </motion.div>
            <div className={`font-mono text-sm uppercase tracking-widest font-bold ${
              decision === "approve" ? "text-emerald-400" : "text-red-400"
            }`}>
              {decision === "approve" ? "Viajero Aprobado" : "Viajero Rechazado"}
            </div>
            <div className={`mt-1 font-mono text-xs uppercase tracking-widest font-bold ${
              isCorrect ? "text-emerald-500/70" : "text-red-500/70"
            }`}>
              {isCorrect ? "(+1 Acierto)" : "(-1 Fallo)"}
            </div>
          </div>

          <div className="p-6 bg-[#030a14]/80 flex-1 flex flex-col justify-between relative z-10 scanline">
            <div>
              {!isCorrect && missedIssue ? (
                <div className="mb-5 rounded-none border border-red-900/50 bg-red-950/20 p-4 shadow-[inset_0_0_15px_rgba(220,38,38,0.1)]">
                  <div className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2 font-mono">
                    {actual === 'reject' ? 'Irregularidad omitida' : 'No había irregularidad real'}
                  </div>
                  <div className="text-red-200 font-mono text-sm leading-relaxed">
                    {missedIssue}
                  </div>
                  {actual === 'reject' && evidence ? (
                    <div className="mt-3 text-xs font-mono text-red-300/80">
                      <div><span className="text-red-500">Documento A:</span> {evidence.document_a}.{evidence.field_a}</div>
                      {evidence.document_b && evidence.field_b ? (
                        <div><span className="text-red-500">Documento B:</span> {evidence.document_b}.{evidence.field_b}</div>
                      ) : null}
                      <div className="mt-1 text-red-200/80">{evidence.explanation}</div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="text-cyan-600 text-xs font-bold uppercase tracking-widest mb-2 font-mono">
                Evaluación del Sistema
              </div>
              <div className="text-cyan-100/90 font-mono text-sm leading-relaxed mb-6">
                {explanation}
              </div>
            </div>

            <button
              onClick={onContinue}
              className="w-full bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 font-bold py-3 px-4 rounded-none transition-colors border border-cyan-700/50 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] uppercase tracking-[0.2em] text-sm font-mono relative overflow-hidden group"
            >
              <span className="relative z-10">{continueLabel}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
