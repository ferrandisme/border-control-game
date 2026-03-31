import { LuggageScanDocument } from '@/schemas/traveler';

import { DocumentShell } from './DocumentShell';

type LuggageScanDocProps = {
  document: LuggageScanDocument;
};

export function LuggageScanDoc({ document }: LuggageScanDocProps) {
  return (
    <DocumentShell title="Escáner de equipaje" subtitle={`${document.bag_count} bultos`} type="luggage_scan">
      <div className="space-y-5">
        <div className="rounded-2xl border border-cyan-400/30 bg-black p-4 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
          <div className="flex items-center justify-between gap-3 border-b border-cyan-400/20 pb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-400/70">Rayos X</p>
              <p className="mt-1 text-sm font-semibold text-cyan-100">Lectura automática del equipaje</p>
            </div>
            <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-200">
              XR
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-500/70">Bolsas detectadas</p>
              <p className="mt-2 font-mono text-3xl font-bold text-cyan-100">{document.bag_count}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-400/70">Objetos detectados</p>
              <p className="mt-2 font-mono text-3xl font-bold text-emerald-300">{document.items_detected.length}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {document.items_detected.length > 0 ? (
              document.items_detected.map((item, index) => {
                const danger = item.suspicious || !item.declared;

                return (
                  <div
                    key={`${item.name}-${index}`}
                    className={`rounded-xl border px-4 py-3 transition ${
                      danger
                        ? 'border-orange-400/40 bg-gradient-to-r from-red-500/10 to-orange-400/10 text-orange-100 animate-pulse'
                        : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-current/70">Objeto {index + 1}</p>
                        <p className="mt-1 text-base font-semibold">{item.name}</p>
                      </div>
                      {danger ? (
                        <span className="mt-0.5 shrink-0 rounded-full border border-orange-300/40 bg-orange-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-200">
                          !
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em]">
                      <span className={`rounded-full px-2 py-1 ${item.suspicious ? 'bg-red-500/20 text-red-200' : 'bg-emerald-500/15 text-emerald-200'}`}>
                        {item.suspicious ? 'Sospechoso' : 'Normal'}
                      </span>
                      <span className={`rounded-full px-2 py-1 ${item.declared ? 'bg-cyan-500/15 text-cyan-200' : 'bg-amber-500/20 text-amber-200'}`}>
                        {item.declared ? 'Declarado' : 'No declarado ⚠'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100">
                No se han detectado objetos relevantes.
              </div>
            )}
          </div>

          {document.notes ? (
            <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 text-sm text-orange-100">
              <p className="text-[10px] uppercase tracking-[0.28em] text-orange-300/80">Notas del escáner</p>
              <p className="mt-2">{document.notes}</p>
            </div>
          ) : null}
        </div>
      </div>
    </DocumentShell>
  );
}
