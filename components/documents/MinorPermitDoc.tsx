import { MinorPermitDocument } from '@/schemas/traveler';

import { DocumentShell } from './DocumentShell';

type MinorPermitDocProps = {
  document: MinorPermitDocument;
};

export function MinorPermitDoc({ document }: MinorPermitDocProps) {
  return (
    <DocumentShell title="Permiso de menor" subtitle={document.minor_name} type="minor_permit">
      <div className="space-y-4 text-sm text-slate-800">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Menor autorizado</p>
          <p className="mt-1 text-lg font-semibold">{document.minor_name}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Padres autorizantes</p>
          <p className="mt-1">{document.authorizing_parents.join(' · ')}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Destino</p>
            <p className="mt-1">{document.destination}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Fechas</p>
            <p className="mt-1 font-mono text-sm">{document.dates}</p>
          </div>
        </div>
      </div>
    </DocumentShell>
  );
}
