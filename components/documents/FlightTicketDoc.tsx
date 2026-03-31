import { FlightTicketDocument } from '@/schemas/traveler';

import { DocumentShell } from './DocumentShell';

type FlightTicketDocProps = {
  document: FlightTicketDocument;
};

export function FlightTicketDoc({ document }: FlightTicketDocProps) {
  return (
    <DocumentShell title="Billete de vuelo" subtitle={document.flight_number} type="flight_ticket">
      <div className="grid gap-4 md:grid-cols-[1fr_128px]">
        <div className="space-y-4 rounded-2xl border border-slate-500/30 bg-white/60 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Origen</p>
              <p className="text-2xl font-bold text-slate-900">{document.origin}</p>
            </div>
            <div className="h-px flex-1 bg-slate-400/50" />
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Destino</p>
              <p className="text-2xl font-bold text-slate-900">{document.destination}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Pasajero</p>
              <p className="text-sm font-medium">{document.ticket_name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Pasaporte</p>
              <p className="font-mono text-sm">{document.passport_number}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Fecha</p>
              <p className="font-mono text-sm">{document.date}</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Escalas</p>
            <p className="mt-1 text-sm">{document.layovers.length > 0 ? document.layovers.join(' · ') : 'Vuelo directo'}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-500/40 bg-slate-100/70 p-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Boarding</p>
          <p className="mt-2 font-mono text-sm font-bold text-slate-900">{document.flight_number}</p>
          <div className="mt-4 h-24 rounded-lg bg-[repeating-linear-gradient(90deg,#0f172a_0,#0f172a_4px,transparent_4px,transparent_7px)] opacity-70" />
        </div>
      </div>
    </DocumentShell>
  );
}
