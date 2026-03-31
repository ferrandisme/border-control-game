"use client";

import { motion } from 'framer-motion';

type DecisionButtonsProps = {
  disabled?: boolean;
  onApproveAction: () => void;
  onRejectAction: () => void;
};

export function DecisionButtons({ disabled = false, onApproveAction, onRejectAction }: DecisionButtonsProps) {
  const isActuallyDisabled = disabled;
  const rejectClassName = isActuallyDisabled
    ? 'relative overflow-hidden rounded-none border border-red-900/50 bg-[#0a1424] px-6 py-5 text-left text-red-900 shadow-none transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40'
    : 'relative overflow-hidden rounded-none border border-red-800/60 bg-red-950/20 px-6 py-5 text-left text-red-200 shadow-none transition-all duration-300 hover:border-red-500 hover:bg-red-950/60 hover:shadow-[0_0_30px_rgba(220,38,38,0.2)]';
  const approveClassName = isActuallyDisabled
    ? 'relative overflow-hidden rounded-none border border-emerald-900/50 bg-[#0a1424] px-6 py-5 text-left text-emerald-900 shadow-none transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40'
    : 'relative overflow-hidden rounded-none border border-emerald-800/60 bg-emerald-950/20 px-6 py-5 text-left text-emerald-200 shadow-none transition-all duration-300 hover:border-emerald-500 hover:bg-emerald-950/60 hover:shadow-stamp';

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <motion.button
          whileHover={isActuallyDisabled ? undefined : { scale: 1.01, y: -1 }}
          whileTap={isActuallyDisabled ? undefined : { scale: 0.99 }}
          onClick={onRejectAction}
          disabled={isActuallyDisabled}
          className={rejectClassName}
        >
          <div className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-red-800/50" />
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-red-500/80">Operación: DENEGAR</p>
          <p className="mt-2 font-sans text-xl font-black uppercase tracking-widest text-red-100">Rechazar</p>
          {!isActuallyDisabled && (
            <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rotate-12 border border-red-500/10 opacity-20" />
          )}
        </motion.button>

        <motion.button
          whileHover={isActuallyDisabled ? undefined : { scale: 1.01, y: -1 }}
          whileTap={isActuallyDisabled ? undefined : { scale: 0.99 }}
          onClick={onApproveAction}
          disabled={isActuallyDisabled}
          className={approveClassName}
        >
          <div className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-emerald-800/50" />
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-emerald-500/80">Operación: AUTORIZAR</p>
          <p className="mt-2 font-sans text-xl font-black uppercase tracking-widest text-emerald-100">Aprobar</p>
          {!isActuallyDisabled && (
            <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rotate-12 border border-emerald-500/10 opacity-20" />
          )}
        </motion.button>
      </div>

    </>
  );
}
