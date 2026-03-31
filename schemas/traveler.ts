import { z } from 'zod';

export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);

export const InconsistencyTypeSchema = z.enum([
  'document_vs_document',
  'document_vs_speech',
  'knowledge_gap',
  'timeline_impossible',
  'financial_mismatch',
]);

/**
 * Inconsistency types that are verifiable purely from the documents present in
 * the traveler's dossier.  These are the only types allowed for guilty cases so
 * that a player can always detect the problem by reading the paperwork —
 * without relying on external world-knowledge or gut-feeling from speech alone.
 *
 * Excluded types and why:
 *   knowledge_gap       – depends on external facts the player cannot look up
 *   document_vs_speech  – detectable only during live conversation, not upfront
 */
export const DOCUMENT_DETECTABLE_INCONSISTENCY_TYPES = [
  'document_vs_document',
  'timeline_impossible',
  'financial_mismatch',
] as const satisfies ReadonlyArray<z.infer<typeof InconsistencyTypeSchema>>;

/**
 * Minimal evidence anchor stored inside internal.evidence for guilty cases.
 * Pinpoints the exact field path(s) that contain the contradiction so that
 * the reveal UI can highlight them without any additional inference.
 *
 * Fields:
 *   document_a  – first document key involved  (e.g. "passport")
 *   field_a     – field within document_a      (e.g. "expiry_date")
 *   document_b  – second document key involved (e.g. "visa")  [optional]
 *   field_b     – field within document_b      (e.g. "valid_until")  [optional]
 *   explanation – one sentence in Spanish explaining the mismatch
 */
export const EvidenceSchema = z.object({
  document_a: z.string().min(1),
  field_a: z.string().min(1),
  document_b: z.string().min(1).optional(),
  field_b: z.string().min(1).optional(),
  explanation: z.string().min(5),
});

export const DemeanorSchema = z.enum([
  'nervous',
  'confident',
  'friendly',
  'evasive',
  'aggressive',
]);

export const GenderSchema = z.enum(['male', 'female']);
export const VoiceHintSchema = z.enum(['male', 'female', 'neutral']);

export const PassportSchema = z.object({
  full_name: z.string().min(3),
  birth_date: z.string().min(4),
  gender: GenderSchema,
  nationality: z.string().min(2),
  number: z.string().min(4),
  issue_date: z.string().min(4),
  expiry_date: z.string().min(4),
  photo: z.string().min(1),
});

export const VisaSchema = z.object({
  type: z.enum(['tourist', 'work', 'transit', 'student']),
  full_name: z.string().min(3),
  birth_date: z.string().min(4),
  passport_number: z.string().min(4),
  issuing_country: z.string().min(2),
  valid_from: z.string().min(4),
  valid_until: z.string().min(4),
  permitted_entries: z.number().int().min(1).max(10),
});

export const FlightTicketSchema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  layovers: z.array(z.string()).max(4),
  date: z.string().min(4),
  flight_number: z.string().min(3),
  ticket_name: z.string().min(3),
  passport_number: z.string().min(4),
});

export const HotelSchema = z.object({
  hotel: z.string().min(2),
  city: z.string().min(2),
  check_in: z.string().min(4),
  check_out: z.string().min(4),
  reservation_name: z.string().min(3),
  passport_number: z.string().min(4),
});

export const BankSchema = z.object({
  balance_approx: z.string().min(1),
  recent_movements: z.array(z.string()).min(3).max(3),
});

export const WorkContractSchema = z.object({
  company: z.string().min(2),
  position: z.string().min(2),
  start_date: z.string().min(4),
  monthly_salary: z.string().min(1),
  country: z.string().min(2),
});

export const InvitationSchema = z.object({
  host_name: z.string().min(3),
  address: z.string().min(5),
  purpose: z.string().min(3),
  stay_duration: z.string().min(1),
});

export const MedicalSchema = z.object({
  vaccines: z.array(z.string()).min(1).max(5),
  date: z.string().min(4),
  signing_doctor: z.string().min(3),
});

export const MinorPermitSchema = z.object({
  minor_name: z.string().min(3),
  authorizing_parents: z.array(z.string()).min(1).max(2),
  destination: z.string().min(2),
  dates: z.string().min(4),
});

export const CustomsSchema = z.object({
  declared_cash: z.string().min(1),
  declared_valuables: z.array(z.string()).max(5),
});

export const LuggageScanSchema = z.object({
  bag_count: z.number().int().min(0),
  items_detected: z.array(
    z.object({
      name: z.string().min(1),
      suspicious: z.boolean(),
      declared: z.boolean(),
    }),
  ),
  notes: z.string().optional(),
});

export const TravelerSchema = z.object({
  internal: z.object({
    inconsistency_id: z.number().int().nullable(),
    inconsistency_type: InconsistencyTypeSchema.nullable(),
    inconsistency_description: z.string().min(10).nullable(),
    guilty: z.boolean(),
    difficulty: DifficultySchema,
    evidence: EvidenceSchema.optional(),
  }),
  profile: z.object({
    name: z.string().min(3),
    age: z.number().int().min(18).max(95),
    gender: GenderSchema,
    nationality: z.string().min(2),
    stated_purpose: z.string().min(3),
    demeanor: DemeanorSchema,
    backstory: z.string().min(20),
    voice_hint: VoiceHintSchema,
  }),
  documents: z.object({
    passport: PassportSchema,
    visa: VisaSchema.nullable(),
    flight_ticket: FlightTicketSchema.nullable(),
    hotel_reservation: HotelSchema.nullable(),
    bank_statement: BankSchema.nullable(),
    work_contract: WorkContractSchema.nullable(),
    invitation_letter: InvitationSchema.nullable(),
    medical_certificate: MedicalSchema.nullable(),
    minor_permit: MinorPermitSchema.nullable(),
    customs_declaration: CustomsSchema.nullable(),
    luggage_scan: LuggageScanSchema.nullable(),
  }),
  conversation_system_prompt: z.string().min(40).max(1200),
});

export type Difficulty = z.infer<typeof DifficultySchema>;
export type InconsistencyType = z.infer<typeof InconsistencyTypeSchema>;
export type DocumentDetectableInconsistencyType = (typeof DOCUMENT_DETECTABLE_INCONSISTENCY_TYPES)[number];
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Demeanor = z.infer<typeof DemeanorSchema>;
export type Gender = z.infer<typeof GenderSchema>;
export type VoiceHint = z.infer<typeof VoiceHintSchema>;
export type PassportDocument = z.infer<typeof PassportSchema>;
export type VisaDocument = z.infer<typeof VisaSchema>;
export type FlightTicketDocument = z.infer<typeof FlightTicketSchema>;
export type HotelReservationDocument = z.infer<typeof HotelSchema>;
export type BankStatementDocument = z.infer<typeof BankSchema>;
export type WorkContractDocument = z.infer<typeof WorkContractSchema>;
export type InvitationLetterDocument = z.infer<typeof InvitationSchema>;
export type MedicalCertificateDocument = z.infer<typeof MedicalSchema>;
export type MinorPermitDocument = z.infer<typeof MinorPermitSchema>;
export type CustomsDeclarationDocument = z.infer<typeof CustomsSchema>;
export type LuggageScanDocument = z.infer<typeof LuggageScanSchema>;
export type Traveler = z.infer<typeof TravelerSchema>;
export type TravelerDocuments = Traveler['documents'];
export type DocumentType = keyof TravelerDocuments;
