import type { Metadata } from 'next';
import { AxiomWebVitals } from 'next-axiom';
import type { ReactNode } from 'react';

import './globals.css';
import { WarningPopup } from '@/components/ui/WarningPopup';

export const metadata: Metadata = {
  title: 'Border Control',
  description: 'Juego de inspección fronteriza con documentos dinámicos y conversación asistida por IA.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased text-slate-200">
        <AxiomWebVitals />
        {children}
        <WarningPopup />
        <div className="crt-overlay" />
      </body>
    </html>
  );
}
