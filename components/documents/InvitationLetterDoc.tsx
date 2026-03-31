import { InvitationLetterDocument } from '@/schemas/traveler';

import { DocumentShell } from './DocumentShell';

type InvitationLetterDocProps = {
  document: InvitationLetterDocument;
};

export function InvitationLetterDoc({ document }: InvitationLetterDocProps) {
  return (
    <DocumentShell title="Carta de invitación" subtitle={document.host_name} type="invitation_letter">
      <div className="space-y-4 text-sm leading-7 text-slate-800">
        <p>
          Yo, <span className="font-semibold">{document.host_name}</span>, con domicilio en{' '}
          <span className="font-semibold">{document.address}</span>, invito formalmente al viajero a permanecer en el país por{' '}
          <span className="font-semibold">{document.stay_duration}</span>.
        </p>
        <div className="rounded-2xl border border-slate-500/30 bg-white/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Motivo declarado</p>
          <p className="mt-2">{document.purpose}</p>
        </div>
      </div>
    </DocumentShell>
  );
}
