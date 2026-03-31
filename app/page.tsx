import Link from 'next/link';
import { AirportCorridor } from '@/components/visuals/AirportCorridor';

export default function HomePage() {
  return (
    <>
      <AirportCorridor />
      <main className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8 scanline">
        
        {/* Decorative Grid Background */}
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-[0.03]">
          <div className="h-[200%] w-[200%] bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(1000px)_rotateX(60deg)_translateY(-100px)_translateZ(200px)]" />
        </div>

        <div className="relative z-10 grid w-full gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          
          <section className="relative overflow-hidden rounded-none border border-cyan-500/30 bg-[#030a14]/90 p-10 shadow-neon-cyan backdrop-blur-md sm:p-14">
            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-cyan-500/0 via-cyan-400 to-cyan-500/0 opacity-50" />
            
            <div className="flex items-center gap-4">
              <div className="h-2 w-2 animate-pulse bg-red-500" />
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-cyan-400/80">Sistema de Control Fronterizo • V2.4.1</p>
            </div>
            
            <h1 className="mt-8 font-sans text-6xl font-black uppercase leading-none tracking-[0.15em] text-transparent text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] sm:text-7xl">
              Border<br/>
              <span className="text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]">Control</span>
            </h1>
            
            <div className="mt-8 border-l-2 border-cyan-500/30 pl-6 font-mono text-sm leading-relaxed text-slate-300">
              <p className="max-w-xl">
                Revisa pasaportes, valida documentos adicionales y conduce interrogatorios.
                Detecta contradicciones entre el relato del viajero y su documentación oficial. 
                <br /><br />
                <span className="text-cyan-300">Un error compromete la seguridad nacional. Tres errores finalizan tu turno.</span>
              </p>
            </div>

            <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:items-center">
              <Link
                href="/game"
                className="group relative flex items-center justify-between gap-6 overflow-hidden rounded-none border border-cyan-400 bg-cyan-950/40 px-8 py-5 font-mono text-sm font-bold uppercase tracking-[0.25em] text-cyan-50 transition-all hover:bg-cyan-900/60 hover:shadow-neon-cyan"
              >
                <span className="relative z-10">Iniciar Turno</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent translate-x-[-100%] transition-transform duration-700 group-hover:translate-x-[100%]" />
              </Link>
              
              <div className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.1em] text-slate-500">
                <span>Estado: <span className="text-emerald-400">En línea</span></span>
                <span>Conexión: <span className="text-cyan-400">Estable</span></span>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div className="flex-1 rounded-none border border-slate-800 bg-[#0a1424]/80 p-8 shadow-2xl backdrop-blur-md">
              <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-slate-400">Protocolo de Inspección</p>
                <span className="font-mono text-xs text-slate-600">REQ-094</span>
              </div>
              
              <ul className="space-y-6 font-mono text-sm leading-relaxed text-slate-300">
                <li className="flex gap-4">
                  <span className="text-cyan-500">01</span>
                  <p>Revisa el pasaporte y cruza los datos con entre 2 y 3 documentos anexos.</p>
                </li>
                <li className="flex gap-4">
                  <span className="text-cyan-500">02</span>
                  <p>Formula un máximo de 5 preguntas estratégicas para validar el motivo del viaje.</p>
                </li>
                <li className="flex gap-4">
                  <span className="text-cyan-500">03</span>
                  <p>Ante cualquier discrepancia material: <span className="text-red-400 font-bold">RECHAZAR</span>.</p>
                </li>
                <li className="flex gap-4">
                  <span className="text-cyan-500">04</span>
                  <p>Si la documentación y el relato son coherentes: <span className="text-emerald-400 font-bold">APROBAR</span>.</p>
                </li>
              </ul>
            </div>
            
            <div className="rounded-none border border-amber-900/30 bg-amber-950/10 p-6 backdrop-blur-md">
              <p className="font-mono text-xs tracking-widest text-amber-500/80 uppercase">Aviso para el operador</p>
              <p className="mt-2 font-mono text-xs text-amber-200/60 leading-relaxed">
                La dificultad del interrogatorio escala conforme avanzan los días de la jornada. Mantenga la atención a los detalles sutiles en fechas, nombres y sellos.
              </p>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
