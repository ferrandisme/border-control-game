"use client";

import { motion } from "framer-motion";

import type { DayNews as DayNewsContent, DayResult } from '@/lib/game-state';

export type DayPerformance = "guilty_passed" | "innocent_rejected" | "perfect" | "mixed";

export interface NewsScreenProps {
  nextDay: number;
  day: number;
  news: DayNewsContent | null;
  performance: DayPerformance;
  results?: DayResult[];
  disabled?: boolean;
  onContinue: () => void;
}

export function NewsScreen({ day, nextDay, news, performance, results = [], disabled = false, onContinue }: NewsScreenProps) {
  const isLoadingNews = !news;

  const getArticleStyles = () => {
    switch (performance) {
      case "guilty_passed":
        return "border-l-8 border-l-red-600 bg-slate-100";
      case "innocent_rejected":
        return "border-l-8 border-l-orange-500 bg-slate-100";
      case "perfect":
        return "bg-emerald-50/80";
      default:
        return "bg-slate-100";
    }
  };

  const tags = performance === 'perfect'
    ? ['Operativo', 'Sin incidencias', `Día ${day}`]
    : performance === 'guilty_passed'
      ? ['Seguridad', 'Fuga de control', `Día ${day}`]
      : performance === 'innocent_rejected'
        ? ['Fronteras', 'Incidente administrativo', `Día ${day}`]
        : ['Aeropuerto', 'Crónica diaria', `Día ${day}`];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-md">
      <div className="flex-1 flex flex-col xl:grid xl:grid-cols-[280px_minmax(0,1fr)_260px] overflow-hidden max-w-[1700px] w-full mx-auto p-4 lg:p-8 gap-6">
        
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="hidden xl:flex w-full flex-col gap-4 text-slate-200 overflow-y-auto pr-2"
        >
          <div className="mb-2">
            <h3 className="uppercase tracking-[0.2em] text-xs font-bold text-slate-500 mb-1">Cierre Operativo</h3>
            <div className="text-3xl font-black font-mono tracking-tighter text-slate-100">
              DÍA {day}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Aciertos</span>
              <span className="text-2xl font-mono text-emerald-400">{results.filter(r => r.was_correct).length}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Fallos</span>
              <span className="text-2xl font-mono text-red-400">{results.filter(r => !r.was_correct).length}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2 mb-2">Registro de Viajeros</h4>
            {results.map((r, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                r.was_correct ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-red-950/20 border-red-900/30'
              }`}>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300">{r.traveler_name}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                    {r.player_decision === 'approve' ? 'Aprobado' : 'Rechazado'}
                  </span>
                </div>
                <div className={`text-xs font-mono font-bold ${r.was_correct ? 'text-emerald-500' : 'text-red-500'}`}>
                  {r.was_correct ? '✓' : '✗'}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 flex flex-col bg-slate-100 rounded-none overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 border-slate-800"
        >
          <div className="flex-1 overflow-y-auto">
            <div className={`p-6 md:p-10 lg:p-16 min-h-full ${getArticleStyles()}`}>
              <div className="max-w-3xl mx-auto">
                <div className="mb-8 border-b-[6px] border-slate-900 pb-4">
                  <div className="flex justify-between items-end mb-2">
                    <h1 className="font-mono text-4xl md:text-6xl font-black uppercase tracking-tighter text-slate-900">
                      {news?.outlet ?? 'Boletin de noticias'}
                    </h1>
                    <span className="font-mono text-sm text-slate-500 font-bold uppercase hidden sm:block">
                      Edición Local
                    </span>
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="font-sans text-5xl md:text-7xl font-black uppercase leading-[0.9] tracking-tighter mb-6 text-slate-900">
                    {news?.headline ?? 'Cerrando la edición del día'}
                  </h2>
                  <p className="font-sans text-xl md:text-3xl font-bold uppercase text-slate-700 leading-snug border-l-8 border-slate-900 pl-4">
                    {news?.subheadline ?? 'El informe final se está ensamblando con los incidentes y decisiones del turno actual.'}
                  </p>
                </div>

                {news ? (
                  <div className="mb-10 whitespace-pre-line text-lg md:text-xl leading-relaxed text-slate-800 font-serif columns-1 md:columns-2 gap-8 text-justify">
                    <span className="font-black text-6xl float-left leading-none pr-3 text-slate-900 mt-[-8px]">{news.body.charAt(0)}</span>
                    {news.body.slice(1)}
                  </div>
                ) : (
                  <div className="mb-10 space-y-4">
                    <div className="h-5 w-full rounded-none bg-slate-300/80 animate-pulse" />
                    <div className="h-5 w-[94%] rounded-none bg-slate-300/70 animate-pulse" />
                    <div className="h-5 w-[88%] rounded-none bg-slate-300/80 animate-pulse" />
                    <div className="h-5 w-[91%] rounded-none bg-slate-300/60 animate-pulse" />
                    <div className="h-5 w-[84%] rounded-none bg-slate-300/75 animate-pulse" />
                    <div className="rounded-none border border-slate-300/80 bg-slate-200/70 px-4 py-3 text-sm font-mono uppercase tracking-[0.2em] text-slate-600">
                      Redacción en curso · preparando artículo del día...
                    </div>
                  </div>
                )}

                <div className="border-t-4 border-slate-900 pt-6 text-xs font-mono uppercase font-bold tracking-widest text-slate-500">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <span>Publicado: {news?.timestamp ?? 'En preparación'}</span>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span key={tag} className="rounded-none border-2 border-slate-900 bg-transparent px-2 py-1 text-[10px] text-slate-900 font-bold">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="hidden xl:flex flex-col gap-4"
        >
          <div className="sticky top-6 rounded-2xl border border-emerald-900/30 bg-slate-900/95 p-5 shadow-2xl">
            <div className="mb-6">
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500">Siguiente fase</p>
              <p className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-100">Día {nextDay}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {isLoadingNews
                  ? 'La redacción está cerrando el artículo. El siguiente turno se abrirá en cuanto quede listo.'
                  : 'El informe ya está archivado. Puedes abrir el siguiente turno cuando quieras.'}
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-wider text-slate-500">Aciertos</span>
                <span className="font-mono text-emerald-400">{results.filter(r => r.was_correct).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-wider text-slate-500">Fallos</span>
                <span className="font-mono text-red-400">{results.filter(r => !r.was_correct).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-wider text-slate-500">Casos</span>
                <span className="font-mono text-cyan-300">{results.length}</span>
              </div>
            </div>

            <button
              onClick={onContinue}
              disabled={disabled || isLoadingNews}
              className="mt-6 w-full rounded-xl bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-emerald-50 shadow-[0_0_20px_rgba(5,150,105,0.3)] transition-all hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              Comenzar Día {nextDay}
            </button>
          </div>
        </motion.aside>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="shrink-0 border-t border-slate-800 bg-slate-900 p-4 xl:hidden"
      >
        <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-slate-400 text-sm font-mono flex flex-col">
            <span className="text-slate-200 font-bold uppercase tracking-widest text-xs">Jornada Completada</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">
              {isLoadingNews ? 'Montando crónica del día...' : `Aciertos: ${results.filter(r => r.was_correct).length}/${results.length}`}
            </span>
          </div>
          <button
            onClick={onContinue}
            disabled={disabled || isLoadingNews}
            className="w-full sm:w-auto rounded bg-emerald-600 px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-emerald-50 shadow-[0_0_20px_rgba(5,150,105,0.3)] transition-all hover:bg-emerald-500 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            Comenzar Día {nextDay}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
