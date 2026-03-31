"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { ChatMessage, MAX_QUESTIONS, PortraitState } from "@/lib/game-state";

export interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  questionsAsked: number;
  onTakeDecision: () => void;
  currentState: string;
  portrait?: PortraitState;
  disabled?: boolean;
  travelerName?: string;
}

export function ChatPanel({
  messages,
  onSendMessage,
  isLoading,
  questionsAsked,
  onTakeDecision,
  currentState,
  disabled = false,
  travelerName,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || disabled || questionsAsked >= MAX_QUESTIONS) return;
    onSendMessage(inputValue);
    setInputValue("");
  };

  const hasTravelerMessages = messages.some((message) => message.role === 'traveler');
  const centerLoadingState = isLoading && !hasTravelerMessages;

  return (
    <div className="flex h-full w-full min-h-[420px] flex-col overflow-hidden rounded-none border border-cyan-500/30 bg-[#030a14]/90 shadow-neon-cyan lg:min-h-[420px] relative">
      <div className="pointer-events-none absolute inset-0 m-1 border-[1px] border-cyan-500/10" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/30 bg-cyan-950/20 px-5 py-3 relative z-10">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-widest font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-none bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              {travelerName || "DESCONOCIDO"}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-cyan-500/60 uppercase tracking-wider">
                ESTADO:
              </span>
              <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider bg-cyan-950/80 px-2 py-0.5 rounded-none border border-cyan-500/30">
                {currentState}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-cyan-900/20">
          <span className="block text-slate-500 font-mono text-xs tracking-widest">
            INTERROGATORIO <span className="text-cyan-400 font-bold">{questionsAsked}</span><span className="text-cyan-800">/</span>{MAX_QUESTIONS}
          </span>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 flex z-10">
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4 scanline bg-[#0a1424]/40">
          <div className={`flex min-h-full flex-col gap-4 ${centerLoadingState ? 'justify-center' : ''}`}>
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: msg.role === 'traveler' ? -10 : 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  className={`flex flex-col max-w-[85%] ${
                    msg.role === "traveler" ? "mr-auto items-start" : 
                    msg.role === "agent" ? "ml-auto items-end" : "mx-auto items-center"
                  }`}
                >
                  <span className={`text-[10px] font-mono mb-1 px-1 uppercase tracking-widest ${
                    msg.role === "traveler" ? "text-slate-500" :
                    msg.role === "agent" ? "text-cyan-500" : "text-amber-500"
                  }`}>
                    {msg.role === "traveler" ? "SUJETO" : msg.role === "agent" ? "INSPECTOR" : "SISTEMA"}
                  </span>
                  <div
                    className={`px-4 py-2.5 rounded-none text-sm font-mono leading-relaxed ${
                      msg.role === "traveler"
                        ? "border-l-2 border-slate-600 bg-slate-900/80 text-slate-300"
                        : msg.role === "agent"
                        ? "border-r-2 border-cyan-400 bg-cyan-950/30 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                        : "border border-amber-900/50 bg-amber-950/20 text-center text-xs text-amber-500"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.audioUrl ? (
                    <audio className="mt-2 h-8 w-full max-w-[280px] opacity-80 contrast-125 grayscale" controls preload="none" src={msg.audioUrl} />
                  ) : null}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col mr-auto items-start max-w-[85%]"
              >
                <span className="text-[10px] font-mono mb-1 px-1 uppercase tracking-widest text-slate-500">
                  SUJETO
                </span>
                <div className="flex h-10 items-center gap-2 rounded-none border-l-2 border-slate-600 bg-slate-900/80 px-4 py-2">
                  <div className="h-4 w-2 rounded-none bg-cyan-500 animate-pulse" />
                  <div className="h-4 w-12 rounded-none bg-slate-800" />
                </div>
              </motion.div>
            )}

            <div className="flex-1" />
            <div ref={endOfMessagesRef} />
          </div>
        </div>
      </div>

      <div className="border-t border-cyan-500/30 bg-[#030a14] p-4 relative z-10">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50 font-mono">{">"}</div>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading || disabled || questionsAsked >= MAX_QUESTIONS}
              placeholder="Ingrese su interrogatorio..."
              className="w-full bg-[#0a1424] border border-cyan-900/50 rounded-none pl-8 pr-3 py-2.5 text-sm text-cyan-50 font-mono focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.2)] disabled:opacity-50 transition-all placeholder:text-cyan-900"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || disabled || questionsAsked >= MAX_QUESTIONS || !inputValue.trim()}
            className="bg-cyan-950/50 hover:bg-cyan-900/80 disabled:bg-slate-900 disabled:text-slate-600 text-cyan-300 px-6 py-2.5 rounded-none font-mono text-sm font-bold uppercase tracking-widest transition-all border border-cyan-700/50 hover:border-cyan-400 disabled:border-slate-800"
          >
            TX
          </button>
        </form>
        <button
          type="button"
          onClick={onTakeDecision}
          disabled={disabled || isLoading}
          className="mt-3 w-full rounded-none border border-cyan-900/40 bg-cyan-950/20 px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.3em] text-cyan-500 transition-all hover:border-cyan-400 hover:bg-cyan-900/40 hover:text-cyan-100 hover:shadow-neon-cyan disabled:cursor-not-allowed disabled:opacity-50"
        >
          [ Emitir Veredicto ]
        </button>
      </div>
    </div>
  );
}
