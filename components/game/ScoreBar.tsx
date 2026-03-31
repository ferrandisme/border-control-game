"use client";

import { ScoreState } from '@/lib/game-state';

export interface ScoreBarProps {
  day: number;
  travelerIndexInDay: number;
  travelersPerDay: number;
  score: ScoreState;
  processedTravelersTotal: number;
  onToggleDebug: () => void;
}

export function ScoreBar({ day, travelerIndexInDay, travelersPerDay, score, processedTravelersTotal, onToggleDebug }: ScoreBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-none border border-cyan-500/30 bg-[#030a14]/95 px-4 py-4 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur sm:px-6">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-cyan-500">Border Control</p>
          <h1 className="font-sans text-xl font-black uppercase tracking-[0.25em] text-slate-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">Terminal Inspección</h1>
        </div>
        
        <div className="hidden h-10 w-px bg-cyan-900/50 sm:block" />
        
        <div className="flex gap-6 font-mono text-xs uppercase tracking-widest">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-cyan-600">Día Operativo</span>
            <span className="font-bold text-cyan-300">{day}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-cyan-600">Viajero Activo</span>
            <span className="font-bold text-cyan-300">{Math.min(travelerIndexInDay + 1, travelersPerDay)}<span className="text-cyan-700">/</span>{travelersPerDay}</span>
          </div>
          <div className="hidden flex-col gap-1 sm:flex">
            <span className="text-[10px] text-cyan-600">Total Global</span>
            <span className="font-bold text-cyan-300">{processedTravelersTotal.toLocaleString('en-US')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 font-mono text-xs">
        <div className="flex items-center gap-2 rounded-none border border-emerald-900/50 bg-emerald-950/20 px-3 py-1.5 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]">
          <span className="text-[10px] text-emerald-600 uppercase tracking-widest">OK</span>
          <span className="font-bold text-emerald-400">{score.correct}</span>
        </div>
        <div className="flex items-center gap-2 rounded-none border border-red-900/50 bg-red-950/20 px-3 py-1.5 shadow-[inset_0_0_10px_rgba(239,68,68,0.05)]">
          <span className="text-[10px] text-red-600 uppercase tracking-widest">ERROR</span>
          <span className="font-bold text-red-400">{score.wrong}</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-none border border-cyan-900/50 bg-cyan-950/20 px-3 py-1.5">
          <span className="text-[10px] text-cyan-600 uppercase tracking-widest">Racha</span>
          <span className="font-bold text-cyan-400">{score.streak}</span>
        </div>
        <button
          type="button"
          aria-label="Toggle Debug"
          onClick={onToggleDebug}
          className="ml-2 rounded-none border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 transition hover:border-cyan-500 hover:bg-cyan-950/50 hover:text-cyan-300"
        >
          🐛
        </button>
      </div>
    </div>
  );
}
