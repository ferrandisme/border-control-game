import { CustomsDeclarationDocument } from '@/schemas/traveler';

import { DocumentShell } from './DocumentShell';

type CustomsDeclarationDocProps = {
  document: CustomsDeclarationDocument;
};

export function CustomsDeclarationDoc({ document }: CustomsDeclarationDocProps) {
  return (
    <DocumentShell title="Declaración aduanera" subtitle={document.declared_cash} type="customs_declaration">
      <div className="space-y-5 text-sm text-slate-800">
        <div className="rounded-2xl border border-red-900/20 bg-red-950/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-red-900/70">Efectivo declarado</p>
          <p className="mt-2 text-2xl font-bold text-red-950">{document.declared_cash}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Objetos de valor</p>
          <ul className="mt-2 space-y-2">
            {document.declared_valuables.length > 0 ? (
              document.declared_valuables.map((item) => (
                <li key={item} className="rounded-xl border border-slate-500/20 bg-white/50 px-3 py-2">
                  {item}
                </li>
              ))
            ) : (
              <li className="rounded-xl border border-slate-500/20 bg-white/50 px-3 py-2">Sin objetos de valor declarados</li>
            )}
          </ul>
        </div>
      </div>
    </DocumentShell>
  );
}
