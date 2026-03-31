"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { DocumentType } from "@/schemas/traveler";

export interface DocumentShellProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  type: DocumentType;
}

export function DocumentShell({ children, title, subtitle, type }: DocumentShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, rotateX: -4 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="document-texture relative w-full overflow-hidden rounded-sm border-2 border-slate-700/50 text-slate-900 shadow-2xl"
    >
      <div className="flex items-center justify-between border-b-2 border-slate-700/50 bg-[#c0c6ba]/80 px-5 py-3 text-slate-900">
        <div className="flex flex-col">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-slate-600">Ministerio de Interior</p>
          <h3 className="font-sans text-sm font-black uppercase tracking-[0.25em] text-slate-900">{title}</h3>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600">{type.replace(/_/g, " ")}</p>
          <p className="font-mono text-xs font-bold text-slate-800">{subtitle}</p>
        </div>
      </div>

      <div className="relative p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute right-8 top-10 h-32 w-32 rounded-full border-[6px] border-slate-800/60" />
          <div className="absolute bottom-10 left-8 h-20 w-20 rotate-12 border-2 border-slate-800/50" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform text-[120px] font-black tracking-tighter text-slate-500/10 rotate-[-15deg]">
            COPIA
          </div>
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </div>

      <div className="border-t-2 border-slate-700/50 bg-[#c0c6ba]/80 px-5 py-3 font-mono text-[10px] font-bold tracking-widest text-slate-700">
        BC-{type.toUpperCase()} // TERMINAL T4 // VALIDACIÓN MANUAL REQUERIDA
      </div>
    </motion.div>
  );
}
