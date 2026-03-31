import { VisaDocument } from '@/schemas/traveler';

import { DocumentShell } from './DocumentShell';
import { FieldList } from './FieldList';

type VisaDocProps = {
  document: VisaDocument;
};

export function VisaDoc({ document }: VisaDocProps) {
  return (
    <DocumentShell title="Visado" subtitle="Permiso de entrada" type="visa">
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-cyan-900/20 bg-cyan-950/10 px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-800">Clase</p>
          <p className="text-lg font-bold uppercase text-cyan-950">{document.type}</p>
        </div>
        <div className="rounded-full border border-cyan-800/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-900">
          {document.permitted_entries} entradas
        </div>
      </div>
      <FieldList
        fields={[
          { label: 'Titular', value: document.full_name },
          { label: 'Nacimiento', value: document.birth_date },
          { label: 'Pasaporte', value: document.passport_number },
          { label: 'País emisor', value: document.issuing_country },
          { label: 'Válido desde', value: document.valid_from },
          { label: 'Válido hasta', value: document.valid_until },
          { label: 'Entradas', value: String(document.permitted_entries) },
        ]}
      />
    </DocumentShell>
  );
}
