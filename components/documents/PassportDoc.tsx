import Image from 'next/image';
import { PassportDocument } from '@/schemas/traveler';
import { PortraitState } from '@/lib/game-state';

import { DocumentShell } from './DocumentShell';

type PassportDocProps = {
  document: PassportDocument;
  portrait: PortraitState;
};

const getInitials = (fullName: string, fallback: string): string => {
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return initials || fallback;
};

export function PassportDoc({ document, portrait }: PassportDocProps) {
  return (
    <DocumentShell title="Pasaporte" subtitle={document.nationality} type="passport">
      <div className="grid gap-5 md:grid-cols-[132px_1fr]">
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-center text-slate-100 shadow-inner">
          {portrait.spriteUrl ? (
            <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border-2 border-cyan-300/50 bg-slate-700">
              <Image
                src={portrait.spriteUrl}
                alt="Retrato de pasaporte"
                width={96}
                height={96}
                unoptimized
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-cyan-300/50 bg-slate-700 text-2xl font-bold tracking-widest text-cyan-100">
              {getInitials(document.full_name, document.photo)}
            </div>
          )}
          <p className="mt-3 text-[10px] uppercase tracking-[0.28em] text-slate-400">Foto estilizada</p>
          <p className="mt-2 text-xs font-semibold text-slate-200">{portrait.spriteUrl ? 'passport' : document.photo}</p>
          {portrait.status !== 'generated' && (
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
              {portrait.status === 'disabled'
                ? 'Imagen deshabilitada'
                : portrait.status === 'error'
                  ? 'Error de imagen'
                  : 'Imagen placeholder'}
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border-b border-slate-500/20 pb-2 sm:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Nombre completo</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{document.full_name}</p>
          </div>
          <div className="border-b border-slate-500/20 pb-2">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Fecha nacimiento</p>
            <p className="mt-1 font-mono text-sm">{document.birth_date}</p>
          </div>
          <div className="border-b border-slate-500/20 pb-2">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Nacionalidad</p>
            <p className="mt-1 text-sm">{document.nationality}</p>
          </div>
          <div className="border-b border-slate-500/20 pb-2">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Sexo</p>
            <p className="mt-1 text-sm">{document.gender === 'male' ? 'Masculino' : 'Femenino'}</p>
          </div>
          <div className="border-b border-slate-500/20 pb-2">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Número</p>
            <p className="mt-1 font-mono text-sm text-red-700">{document.number}</p>
          </div>
          <div className="border-b border-slate-500/20 pb-2">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Fecha expedición</p>
            <p className="mt-1 font-mono text-sm">{document.issue_date}</p>
          </div>
          <div className="border-b border-slate-500/20 pb-2 sm:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Fecha caducidad</p>
            <p className="mt-1 font-mono text-sm">{document.expiry_date}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-400/30 bg-slate-100/80 p-3 font-mono text-[10px] text-slate-600">
        P&lt;{document.nationality.slice(0, 3).toUpperCase()}&lt;{document.full_name.toUpperCase().replace(/\s+/g, '&lt;')}<br />
        {document.number.toUpperCase()}&lt;{document.birth_date.replace(/-/g, '')}&lt;{document.expiry_date.replace(/-/g, '')}
      </div>
    </DocumentShell>
  );
}
