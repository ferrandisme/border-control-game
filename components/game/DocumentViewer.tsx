"use client";

import { AnimatePresence, motion } from "framer-motion";

import {
  BankStatementDocument,
  CustomsDeclarationDocument,
  DocumentType,
  FlightTicketDocument,
  HotelReservationDocument,
  InvitationLetterDocument,
  LuggageScanDocument,
  MedicalCertificateDocument,
  MinorPermitDocument,
  PassportDocument,
  TravelerDocuments,
  VisaDocument,
  WorkContractDocument,
} from "@/schemas/traveler";
import { PortraitState } from "@/lib/game-state";

import { BankStatementDoc } from "../documents/BankStatementDoc";
import { CustomsDeclarationDoc } from "../documents/CustomsDeclarationDoc";
import { FlightTicketDoc } from "../documents/FlightTicketDoc";
import { HotelReservationDoc } from "../documents/HotelReservationDoc";
import { InvitationLetterDoc } from "../documents/InvitationLetterDoc";
import { LuggageScanDoc } from "../documents/LuggageScanDoc";
import { MedicalCertificateDoc } from "../documents/MedicalCertificateDoc";
import { MinorPermitDoc } from "../documents/MinorPermitDoc";
import { PassportDoc } from "../documents/PassportDoc";
import { VisaDoc } from "../documents/VisaDoc";
import { WorkContractDoc } from "../documents/WorkContractDoc";

export interface DocumentViewerProps {
  documents: TravelerDocuments;
  activeDocument: DocumentType;
  onSelectDocument: (document: DocumentType) => void;
  portrait: PortraitState;
}

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  passport: 'Pasaporte',
  visa: 'Visado',
  flight_ticket: 'Billete',
  hotel_reservation: 'Hotel',
  bank_statement: 'Banco',
  work_contract: 'Contrato',
  invitation_letter: 'Invitación',
  medical_certificate: 'Médico',
  minor_permit: 'Menor',
  customs_declaration: 'Aduanas',
  luggage_scan: 'Escáner',
};

const getAvailableDocuments = (documents: TravelerDocuments): DocumentType[] => {
  return (Object.entries(documents) as Array<[DocumentType, TravelerDocuments[DocumentType]]>)
    .filter(([, value]) => value !== null)
    .map(([type]) => type);
};

const renderDocument = (type: DocumentType, documents: TravelerDocuments, portrait: PortraitState) => {
  switch (type) {
    case 'passport':
      return <PassportDoc document={documents.passport as PassportDocument} portrait={portrait} />;
    case 'visa':
      return documents.visa ? <VisaDoc document={documents.visa as VisaDocument} /> : null;
    case 'flight_ticket':
      return documents.flight_ticket ? <FlightTicketDoc document={documents.flight_ticket as FlightTicketDocument} /> : null;
    case 'hotel_reservation':
      return documents.hotel_reservation ? (
        <HotelReservationDoc document={documents.hotel_reservation as HotelReservationDocument} />
      ) : null;
    case 'bank_statement':
      return documents.bank_statement ? <BankStatementDoc document={documents.bank_statement as BankStatementDocument} /> : null;
    case 'work_contract':
      return documents.work_contract ? <WorkContractDoc document={documents.work_contract as WorkContractDocument} /> : null;
    case 'invitation_letter':
      return documents.invitation_letter ? (
        <InvitationLetterDoc document={documents.invitation_letter as InvitationLetterDocument} />
      ) : null;
    case 'medical_certificate':
      return documents.medical_certificate ? (
        <MedicalCertificateDoc document={documents.medical_certificate as MedicalCertificateDocument} />
      ) : null;
    case 'minor_permit':
      return documents.minor_permit ? <MinorPermitDoc document={documents.minor_permit as MinorPermitDocument} /> : null;
    case 'customs_declaration':
      return documents.customs_declaration ? (
        <CustomsDeclarationDoc document={documents.customs_declaration as CustomsDeclarationDocument} />
      ) : null;
    case 'luggage_scan':
      return documents.luggage_scan ? (
        <LuggageScanDoc document={documents.luggage_scan as LuggageScanDocument} />
      ) : null;
  }
};

export function DocumentViewer({ documents, activeDocument, onSelectDocument, portrait }: DocumentViewerProps) {
  const availableDocuments = getAvailableDocuments(documents);

  return (
    <div className="relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-none border border-cyan-900/40 bg-[#0a1424]/90 p-1 shadow-2xl">
      <div className="pointer-events-none absolute inset-0 m-1 border-[1px] border-cyan-500/10" />
      
      <div className="mb-2 flex gap-1 overflow-x-auto border-b border-cyan-900/30 bg-[#030a14] p-2 relative z-10">
        {availableDocuments.map((documentType) => {
          const active = activeDocument === documentType;

          return (
            <button
              key={documentType}
              type="button"
              onClick={() => onSelectDocument(documentType)}
              className={`relative whitespace-nowrap rounded-none border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${
                active
                  ? 'border-cyan-400 bg-cyan-950/40 text-cyan-100 shadow-[inset_2px_0_0_rgba(34,211,238,1)]'
                  : 'border-slate-800 bg-[#0a1424] text-slate-500 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {DOCUMENT_LABELS[documentType]}
            </button>
          );
        })}
      </div>

      <div className="scanline relative z-10 flex-1 overflow-auto bg-[#0a1424] p-2 sm:p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDocument}
            initial={{ opacity: 0, filter: "blur(4px)", scale: 0.98 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(4px)", scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderDocument(activeDocument, documents, portrait)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
