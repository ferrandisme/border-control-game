import { MedicalCertificateDocument } from '@/schemas/traveler';

import { DocumentShell } from './DocumentShell';

type MedicalCertificateDocProps = {
  document: MedicalCertificateDocument;
};

export function MedicalCertificateDoc({ document }: MedicalCertificateDocProps) {
  return (
    <DocumentShell title="Certificado médico" subtitle={document.signing_doctor} type="medical_certificate">
      <div className="space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Vacunas registradas</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {document.vaccines.map((vaccine) => (
              <span key={vaccine} className="rounded-full border border-cyan-900/20 bg-cyan-950/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-950">
                {vaccine}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Fecha</p>
            <p className="mt-1 font-mono text-sm">{document.date}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Médico firmante</p>
            <p className="mt-1 text-sm">{document.signing_doctor}</p>
          </div>
        </div>
      </div>
    </DocumentShell>
  );
}
