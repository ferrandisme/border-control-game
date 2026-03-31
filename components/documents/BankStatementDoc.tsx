import { BankStatementDocument } from '@/schemas/traveler';

import { DocumentShell } from './DocumentShell';

type BankStatementDocProps = {
  document: BankStatementDocument;
};

export function BankStatementDoc({ document }: BankStatementDocProps) {
  return (
    <DocumentShell title="Extracto bancario" subtitle="Últimos movimientos" type="bank_statement">
      <div className="rounded-2xl border border-emerald-900/20 bg-emerald-950/10 p-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-900/70">Saldo aproximado</p>
        <p className="mt-2 text-3xl font-bold text-emerald-950">{document.balance_approx}</p>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-500/30">
        <div className="grid grid-cols-[1fr_120px] bg-slate-900 px-4 py-3 text-[10px] uppercase tracking-[0.28em] text-slate-300">
          <span>Concepto</span>
          <span className="text-right">Resumen</span>
        </div>
        {document.recent_movements.map((movement, index) => (
          <div key={movement} className="grid grid-cols-[1fr_120px] border-t border-slate-400/20 bg-white/40 px-4 py-3 text-sm text-slate-800">
            <span>Movimiento {index + 1}</span>
            <span className="text-right font-medium">{movement}</span>
          </div>
        ))}
      </div>
    </DocumentShell>
  );
}
