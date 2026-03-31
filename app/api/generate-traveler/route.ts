import { NextResponse } from 'next/server';
import { z } from 'zod';

import { aiService } from '@/lib/ai-service';
import { getDifficulty, selectInconsistency } from '@/lib/difficulty';
import { getFeatureFlags } from '@/lib/feature-flags';
import {
  getById,
  isConversationDrivenCase,
  isReliablyVerifiableCase,
  type InconsistencyCategory,
  type InconsistencyDefinition,
} from '@/lib/inconsistency-catalog';
import { generatePassportPhoto, getPlaceholderPassportPortrait } from '@/lib/media-service';
import { getScenarioDates, type ScenarioDates } from '@/lib/scenario-date';
import { generateTravelerName, isPlaceholderTravelerName, resolveTravelerName } from '@/lib/traveler-name';
import {
  DifficultySchema,
  GenderSchema,
  InconsistencyType,
  type Difficulty,
  type DocumentType,
  type Evidence,
  type Gender,
  Traveler,
  TravelerSchema,
  VoiceHintSchema,
} from '@/schemas/traveler';
import type { AIProvider } from '@/lib/game-state';
import { withRouteLogger } from '@/lib/route-logger';

export const runtime = 'nodejs';

const AIRPORT_NAME = 'Aeropuerto Internacional de Levante';
const DESTINATION_CITY = 'Levante';
const DESTINATION_COUNTRY = 'Levante';
const DEFAULT_ORIGIN_CITY = 'Puerto Norte';
const DEFAULT_EMPLOYER = 'Logística Portuaria de Levante';
const ALTERNATE_HOTEL_CITY = 'Puerto Norte';

const SlotPlanSchema = z.object({
  slot_index: z.number().int().min(0).max(5),
  case_id: z.number().int().min(1).max(30).nullable(),
  name: z.string().min(1).max(100),
  gender: z.enum(['male', 'female']),
  nationality: z.string().min(1).max(60),
  age: z.number().int().min(18).max(95),
  demeanor: z.enum(['nervous', 'confident', 'friendly', 'evasive', 'aggressive']),
  stated_purpose: z.string().min(1).max(200),
  backstory: z.string().min(1).max(600),
  visual_identity: z.object({
    age_range: z.string().min(1).max(60),
    nationality: z.string().min(1).max(60),
    demeanor: z.enum(['nervous', 'confident', 'friendly', 'evasive', 'aggressive']),
    gender: z.enum(['male', 'female']),
  }),
});

const RequestSchema = z.object({
  day: z.number().int().min(1).default(1),
  difficulty: DifficultySchema.optional(),
  inconsistency_id: z.number().int().min(1).max(30).optional(),
  force_clean: z.boolean().optional(),
  skip_image_generation: z.boolean().optional(),
  preferred_provider: z.enum(['groq', 'openrouter', 'cerebras', 'vercel']).optional(),
  slot_plan: SlotPlanSchema.optional(),
});

const OPTIONAL_DOCUMENTS = [
  'visa',
  'flight_ticket',
  'hotel_reservation',
  'bank_statement',
  'work_contract',
  'invitation_letter',
  'medical_certificate',
  'minor_permit',
  'customs_declaration',
  'luggage_scan',
] as const;

type OptionalDocumentKey = (typeof OPTIONAL_DOCUMENTS)[number];

const ADULT_ONLY_EXCLUDED_DOCUMENTS: ReadonlyArray<OptionalDocumentKey> = ['minor_permit'];

const DOCUMENT_FIELD_HINTS: Record<DocumentType, string> = {
  passport: 'full_name',
  visa: 'full_name',
  flight_ticket: 'ticket_name',
  hotel_reservation: 'city',
  bank_statement: 'recent_movements',
  work_contract: 'start_date',
  invitation_letter: 'host_name',
  medical_certificate: 'date',
  minor_permit: 'authorizing_parents',
  customs_declaration: 'declared_valuables',
  luggage_scan: 'items_detected',
};

const CASE_EVIDENCE_HINTS: Partial<Record<number, { fieldA: string; fieldB?: string }>> = {
  1: { fieldA: 'full_name', fieldB: 'ticket_name' },
  2: { fieldA: 'birth_date', fieldB: 'birth_date' },
  3: { fieldA: 'type', fieldB: 'start_date' },
  4: { fieldA: 'destination', fieldB: 'city' },
  5: { fieldA: 'valid_until', fieldB: 'date' },
  6: { fieldA: 'check_out', fieldB: 'date' },
  26: { fieldA: 'issue_date', fieldB: 'valid_from' },
  27: { fieldA: 'valid_from', fieldB: 'date' },
  29: { fieldA: 'date', fieldB: 'date' },
};

const CATEGORY_TO_INTERNAL_TYPE: Record<InconsistencyCategory, InconsistencyType> = {
  doc_vs_doc: 'document_vs_document',
  declaration: 'document_vs_speech',
  speech_vs_doc: 'document_vs_speech',
  knowledge_gap: 'knowledge_gap',
  timeline: 'timeline_impossible',
  visual: 'document_vs_document',
};

const normalizeGender = (value: unknown, fallback: Gender): Gender => {
  return normalizeEnumValue(value, GenderSchema.options, {
    hombre: 'male',
    masculino: 'male',
    mujer: 'female',
    femenino: 'female',
  }, fallback);
};

const inferGenderFromName = (name: string): Gender => {
  const lowered = name.toLowerCase();
  if (/[aá]$/.test(lowered) || lowered.includes('maría') || lowered.includes('lucía') || lowered.includes('sofia')) {
    return 'female';
  }

  return 'male';
};

const genderToVoiceHint = (gender: Gender): 'male' | 'female' => {
  return gender;
};

const normalizeEvidenceDocumentKey = (value: string): string => {
  const lowered = value.toLowerCase().trim();

  const aliases: Record<string, string> = {
    boarding_pass: 'flight_ticket',
    boardingpass: 'flight_ticket',
    ticket: 'flight_ticket',
    hotel: 'hotel_reservation',
    reservation: 'hotel_reservation',
    invitation: 'invitation_letter',
    letter: 'invitation_letter',
    contract: 'work_contract',
    bank: 'bank_statement',
    medical: 'medical_certificate',
    permit: 'minor_permit',
    customs: 'customs_declaration',
    luggage: 'luggage_scan',
    luggage_scan: 'luggage_scan',
    baggage: 'luggage_scan',
    bag_scan: 'luggage_scan',
    xray: 'luggage_scan',
    luggage_xray: 'luggage_scan',
  };

  return aliases[lowered] ?? lowered;
};

const normalizeEnumValue = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  spanishMap?: Record<string, T>,
  fallbackOverride?: T,
): T => {
  const fallback = fallbackOverride ?? (allowed[0] as T);

  if (typeof value !== 'string') {
    return fallback;
  }

  const lowered = value.toLowerCase().trim();
  const directMatch = allowed.find((item) => item === lowered);
  if (directMatch) {
    return directMatch;
  }

  if (spanishMap?.[lowered]) {
    return spanishMap[lowered];
  }

  return fallback;
};

const asString = (value: unknown, fallback: string): string => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
};

const asNumber = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const asStringArray = (value: unknown, fallback: string[] = []): string[] => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const strings = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return strings.length > 0 ? strings : fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toInternalInconsistencyType = (definition: InconsistencyDefinition | null): InconsistencyType | null => {
  if (!definition) {
    return null;
  }

  return CATEGORY_TO_INTERNAL_TYPE[definition.category];
};

const shouldExposeEvidence = (definition: InconsistencyDefinition | null): boolean => {
  if (!definition) {
    return false;
  }

  return isReliablyVerifiableCase(definition);
};

const getEvidenceInstruction = (definition: InconsistencyDefinition | null, internalType: InconsistencyType | null): string | null => {
  if (!definition || !internalType) {
    return null;
  }

  if (shouldExposeEvidence(definition)) {
    return `El caso es culpable y corresponde exactamente al caso #${definition.id}. Debes incluir internal.inconsistency_id=${definition.id}, internal.inconsistency_type=${internalType} y internal.inconsistency_description en español resumiendo la irregularidad. Rellena internal.evidence con los documentos y campos exactos implicados en esa contradicción.`;
  }

  if (isConversationDrivenCase(definition)) {
    return `El caso es culpable y corresponde exactamente al caso #${definition.id}. Debes incluir internal.inconsistency_id=${definition.id}, internal.inconsistency_type=${internalType} e internal.inconsistency_description en español resumiendo la irregularidad. No incluyas internal.evidence: en estos casos la contradicción debe manifestarse durante el interrogatorio y no como un ancla fija en el expediente.`;
  }

  return `El caso es culpable y corresponde exactamente al caso #${definition.id}. Debes incluir internal.inconsistency_id=${definition.id}, internal.inconsistency_type=${internalType} e internal.inconsistency_description en español resumiendo la irregularidad.`;
};

const getEvidenceForCase = (definition: InconsistencyDefinition | null): Evidence | undefined => {
  if (!definition || !shouldExposeEvidence(definition)) {
    return undefined;
  }

  const [documentA, documentB] = definition.documents_required as [DocumentType, DocumentType?];
  const override = CASE_EVIDENCE_HINTS[definition.id];
  const fieldA = override?.fieldA ?? DOCUMENT_FIELD_HINTS[documentA] ?? 'details';
  const fieldB = documentB ? override?.fieldB ?? DOCUMENT_FIELD_HINTS[documentB] ?? 'details' : undefined;

  return {
    document_a: documentA,
    field_a: fieldA,
    ...(documentB ? { document_b: documentB } : {}),
    ...(fieldB ? { field_b: fieldB } : {}),
    explanation: definition.title,
  };
};

const normalizeComparableString = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
};

const getNameTokens = (value: string): string[] => normalizeComparableString(value).split(' ').filter(Boolean);

const namesShareIdentity = (left: string, right: string): boolean => {
  const leftTokens = getNameTokens(left);
  const rightTokens = getNameTokens(right);
  return leftTokens.length > 0 && leftTokens.some((token) => rightTokens.includes(token));
};

const buildSubtleTicketNameMismatch = (passportName: string): string => {
  const tokens = passportName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length >= 3) {
    const givenNames = tokens.slice(0, -2);
    const surnames = tokens.slice(-2);
    return [...givenNames, `${surnames[0]}-${surnames[1]}`].join(' ');
  }

  if (tokens.length === 2) {
    const secondToken = tokens[1];
    return secondToken ? `${tokens[0]} ${secondToken.charAt(0)}.` : passportName;
  }

  return `${passportName} Jr.`;
};

const buildSubtleBirthDateMismatch = (birthDate: string): string => {
  const parsed = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return birthDate;
  }

  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
};

const applyDeterministicCaseAdjustments = (
  documents: Traveler['documents'],
  inconsistencyId: number | null,
): Traveler['documents'] => {
  if (!inconsistencyId) {
    return documents;
  }

  const adjustedDocuments = {
    ...documents,
    visa: documents.visa ? { ...documents.visa } : null,
    flight_ticket: documents.flight_ticket ? { ...documents.flight_ticket } : null,
    hotel_reservation: documents.hotel_reservation ? { ...documents.hotel_reservation } : null,
  };

  switch (inconsistencyId) {
    case 1:
      if (adjustedDocuments.flight_ticket) {
        adjustedDocuments.flight_ticket.ticket_name = buildSubtleTicketNameMismatch(documents.passport.full_name);
      }
      break;
    case 2:
      if (adjustedDocuments.visa) {
        adjustedDocuments.visa.birth_date = buildSubtleBirthDateMismatch(documents.passport.birth_date);
      }
      break;
    case 4:
      if (adjustedDocuments.flight_ticket) {
        adjustedDocuments.flight_ticket.destination = DESTINATION_CITY;
        adjustedDocuments.flight_ticket.layovers = [];
      }
      if (adjustedDocuments.hotel_reservation) {
        adjustedDocuments.hotel_reservation.city = ALTERNATE_HOTEL_CITY;
      }
      break;
    default:
      break;
  }

  return adjustedDocuments;
};

const getRequiredOptionalDocuments = (definition: InconsistencyDefinition | null): OptionalDocumentKey[] => {
  if (!definition) {
    return [];
  }

  return definition.documents_required.filter(
    (document): document is OptionalDocumentKey => document !== 'passport' && !ADULT_ONLY_EXCLUDED_DOCUMENTS.includes(document as OptionalDocumentKey),
  );
};

const selectOptionalDocumentKeys = (definition: InconsistencyDefinition | null): OptionalDocumentKey[] => {
  const required = getRequiredOptionalDocuments(definition);
  const uniqueRequired = Array.from(new Set(required));
  const targetCount = Math.max(2, Math.min(3, uniqueRequired.length || 2));
  const remaining = OPTIONAL_DOCUMENTS.filter(
    (document) => !uniqueRequired.includes(document) && !ADULT_ONLY_EXCLUDED_DOCUMENTS.includes(document),
  );

  while (uniqueRequired.length < targetCount && remaining.length > 0) {
    const index = Math.floor(Math.random() * remaining.length);
    uniqueRequired.push(remaining[index] as OptionalDocumentKey);
    remaining.splice(index, 1);
  }

  return uniqueRequired.slice(0, 3);
};

const repairTravelerObject = (raw: unknown, inconsistencyId: number | null, day: number): unknown => {
  const inconsistency = inconsistencyId ? getById(inconsistencyId) ?? null : null;
  const scenarioDates = getScenarioDates(day);
  const desiredOptionalDocuments = selectOptionalDocumentKeys(inconsistency);
  const root = isRecord(raw) ? raw : {};
  const internal = isRecord(root.internal) ? root.internal : {};
  const profile = isRecord(root.profile) ? root.profile : {};
  const documents = isRecord(root.documents) ? root.documents : {};
  const passport = isRecord(documents.passport) ? documents.passport : {};

  const normalizedNationality = asString(profile.nationality, asString(passport.nationality, 'Desconocida'));
  const normalizedName = resolveTravelerName(
    typeof profile.name === 'string' ? profile.name : null,
    typeof passport.full_name === 'string' ? passport.full_name : null,
  ) ?? generateTravelerName(normalizedNationality);
  const normalizedGender = normalizeGender(profile.gender ?? passport.gender, inferGenderFromName(normalizedName));
  const normalizedAge = Math.min(95, Math.max(18, asNumber(profile.age, 34)));

  const repairNullableDoc = <T>(value: unknown, builder: (doc: Record<string, unknown>) => T): T | null => {
    if (value === null) {
      return null;
    }

    if (!isRecord(value)) {
      return null;
    }

    return builder(value);
  };

  const repairedOptionalDocuments = {
    visa: repairNullableDoc(documents.visa, (doc) => ({
      type: normalizeEnumValue(doc.type, ['tourist', 'work', 'transit', 'student'] as const, {
        turista: 'tourist',
        trabajo: 'work',
        tránsito: 'transit',
        transito: 'transit',
        estudiante: 'student',
      }),
      full_name: asString(doc.full_name, normalizedName),
      birth_date: asString(doc.birth_date, asString(passport.birth_date, '1990-01-01')),
      passport_number: asString(doc.passport_number, asString(passport.number, 'BC0000001')),
      issuing_country: asString(doc.issuing_country, normalizedNationality),
      valid_from: asString(doc.valid_from, scenarioDates.visaValidFrom),
      valid_until: asString(doc.valid_until, scenarioDates.visaValidUntil),
      permitted_entries: Math.min(10, Math.max(1, Math.round(asNumber(doc.permitted_entries, 1)))),
    })),
    flight_ticket: repairNullableDoc(documents.flight_ticket, (doc) => ({
        origin: asString(doc.origin, DEFAULT_ORIGIN_CITY),
        destination: asString(doc.destination, DESTINATION_CITY),
         layovers: asStringArray(doc.layovers, []),
         date: asString(doc.date, scenarioDates.arrivalDate),
         flight_number: asString(doc.flight_number, 'BC102'),
      ticket_name: asString(doc.ticket_name, normalizedName),
      passport_number: asString(doc.passport_number, asString(passport.number, 'BC0000001')),
     })),
    hotel_reservation: repairNullableDoc(documents.hotel_reservation, (doc) => ({
      hotel: asString(doc.hotel, 'Hotel Central'),
         city: asString(doc.city, DESTINATION_CITY),
         check_in: asString(doc.check_in, scenarioDates.arrivalDate),
         check_out: asString(doc.check_out, scenarioDates.departureDate),
         reservation_name: asString(doc.reservation_name, normalizedName),
         passport_number: asString(doc.passport_number, asString(passport.number, 'BC0000001')),
     })),
    bank_statement: repairNullableDoc(documents.bank_statement, (doc) => ({
      balance_approx: asString(doc.balance_approx, '€3.200'),
      recent_movements: asStringArray(doc.recent_movements, ['Pago hotel Levante €240', 'Restaurante puerto €38', 'Retirada €100']).slice(0, 3),
    })),
    work_contract: repairNullableDoc(documents.work_contract, (doc) => ({
      company: asString(doc.company, DEFAULT_EMPLOYER),
      position: asString(doc.position, 'Consultor'),
      start_date: asString(doc.start_date, scenarioDates.contractStartDate),
      monthly_salary: asString(doc.monthly_salary, '€2.400'),
        country: asString(doc.country, DESTINATION_COUNTRY),
      })),
      invitation_letter: repairNullableDoc(documents.invitation_letter, (doc) => ({
        host_name: asString(doc.host_name, 'María Torres'),
        address: asString(doc.address, `Avenida de las Terminales 14, ${DESTINATION_CITY}`),
        purpose: asString(doc.purpose, 'Visita familiar'),
        stay_duration: asString(doc.stay_duration, '7 días'),
      })),
    medical_certificate: repairNullableDoc(documents.medical_certificate, (doc) => ({
      vaccines: asStringArray(doc.vaccines, ['Fiebre amarilla']),
      date: asString(doc.date, scenarioDates.certificateDate),
      signing_doctor: asString(doc.signing_doctor, 'Dra. Elena Ruiz'),
    })),
    minor_permit: repairNullableDoc(documents.minor_permit, (doc) => ({
      minor_name: asString(doc.minor_name, normalizedName),
      authorizing_parents: asStringArray(doc.authorizing_parents, ['Padre autorizado']),
        destination: asString(doc.destination, DESTINATION_CITY),
        dates: asString(doc.dates, `${scenarioDates.arrivalDate} a ${scenarioDates.departureDate}`),
      })),
    customs_declaration: repairNullableDoc(documents.customs_declaration, (doc) => ({
      declared_cash: asString(doc.declared_cash, '€0'),
      declared_valuables: asStringArray(doc.declared_valuables, []),
    })),
    luggage_scan: repairNullableDoc(documents.luggage_scan, (doc) => ({
      bag_count: Math.max(0, Math.round(asNumber(doc.bag_count, 1))),
      items_detected: Array.isArray(doc.items_detected)
        ? doc.items_detected
            .filter(isRecord)
            .map((item) => ({
              name: asString(item.name, 'objeto sin identificar'),
              suspicious: typeof item.suspicious === 'boolean' ? item.suspicious : false,
              declared: typeof item.declared === 'boolean' ? item.declared : true,
            }))
        : [],
      notes: typeof doc.notes === 'string' && doc.notes.trim().length > 0 ? doc.notes.trim() : undefined,
    })),
  };

  const desiredKeys = desiredOptionalDocuments;

  const normalizedDocuments: typeof repairedOptionalDocuments = {
    visa: desiredKeys.includes('visa') ? repairedOptionalDocuments.visa : null,
    flight_ticket: desiredKeys.includes('flight_ticket') ? repairedOptionalDocuments.flight_ticket : null,
    hotel_reservation: desiredKeys.includes('hotel_reservation') ? repairedOptionalDocuments.hotel_reservation : null,
    bank_statement: desiredKeys.includes('bank_statement') ? repairedOptionalDocuments.bank_statement : null,
    work_contract: desiredKeys.includes('work_contract') ? repairedOptionalDocuments.work_contract : null,
    invitation_letter: desiredKeys.includes('invitation_letter') ? repairedOptionalDocuments.invitation_letter : null,
    medical_certificate: desiredKeys.includes('medical_certificate') ? repairedOptionalDocuments.medical_certificate : null,
    minor_permit: desiredKeys.includes('minor_permit') ? repairedOptionalDocuments.minor_permit : null,
    customs_declaration: desiredKeys.includes('customs_declaration') ? repairedOptionalDocuments.customs_declaration : null,
    luggage_scan: desiredKeys.includes('luggage_scan') ? repairedOptionalDocuments.luggage_scan : null,
  };

  if (normalizedAge >= 18) {
    normalizedDocuments.minor_permit = null;
  }

  const withFallbackOptionalDocuments = {
    visa:
      normalizedDocuments.visa ?? {
        type: 'tourist',
        full_name: normalizedName,
        birth_date: asString(passport.birth_date, '1990-01-01'),
        passport_number: asString(passport.number, 'BC0000001'),
        issuing_country: normalizedNationality,
        valid_from: scenarioDates.visaValidFrom,
        valid_until: scenarioDates.visaValidUntil,
        permitted_entries: 1,
      },
    flight_ticket:
      normalizedDocuments.flight_ticket ?? {
        origin: DEFAULT_ORIGIN_CITY,
        destination: DESTINATION_CITY,
        layovers: [],
        date: scenarioDates.arrivalDate,
        flight_number: 'BC102',
        ticket_name: normalizedName,
        passport_number: asString(passport.number, 'BC0000001'),
      },
    hotel_reservation:
      normalizedDocuments.hotel_reservation ?? {
        hotel: 'Hotel Central',
        city: DESTINATION_CITY,
        check_in: scenarioDates.arrivalDate,
        check_out: scenarioDates.departureDate,
        reservation_name: normalizedName,
        passport_number: asString(passport.number, 'BC0000001'),
      },
    bank_statement:
      normalizedDocuments.bank_statement ?? {
        balance_approx: '€3.200',
        recent_movements: ['Pago hotel €240', 'Restaurante €38', 'Retirada €100'],
      },
    work_contract:
      normalizedDocuments.work_contract ?? {
        company: DEFAULT_EMPLOYER,
        position: 'Consultor',
        start_date: scenarioDates.contractStartDate,
        monthly_salary: '€2.400',
        country: DESTINATION_COUNTRY,
      },
    invitation_letter:
      normalizedDocuments.invitation_letter ?? {
        host_name: 'María Torres',
        address: `Avenida de las Terminales 14, ${DESTINATION_CITY}`,
        purpose: 'Visita familiar',
        stay_duration: '7 días',
      },
    medical_certificate:
      normalizedDocuments.medical_certificate ?? {
        vaccines: ['Fiebre amarilla'],
        date: scenarioDates.certificateDate,
        signing_doctor: 'Dra. Elena Ruiz',
      },
    minor_permit:
      normalizedAge < 18
        ? normalizedDocuments.minor_permit ?? {
        minor_name: normalizedName,
        authorizing_parents: ['Padre autorizado'],
        destination: DESTINATION_CITY,
        dates: `${scenarioDates.arrivalDate} a ${scenarioDates.departureDate}`,
      }
        : null,
    customs_declaration:
      normalizedDocuments.customs_declaration ?? {
        declared_cash: '€0',
        declared_valuables: [],
      },
    luggage_scan:
      normalizedDocuments.luggage_scan ?? {
        bag_count: 1,
        items_detected: [
          {
            name: 'ropa doblada',
            suspicious: false,
            declared: true,
          },
        ],
      },
  };

  const repairedEvidence = (() => {
    if (!shouldExposeEvidence(inconsistency)) {
      return undefined;
    }

    if (isRecord(internal.evidence)) {
      const ev = internal.evidence;
      const docA = normalizeEvidenceDocumentKey(asString(ev.document_a, ''));
      const fieldA = asString(ev.field_a, '');
      if (docA && fieldA) {
        const repaired: Evidence = {
          document_a: docA,
          field_a: fieldA,
          explanation: asString(ev.explanation, inconsistency?.title ?? 'Contradicción detectada en el expediente.'),
        };
        const docB = normalizeEvidenceDocumentKey(asString(ev.document_b, ''));
        const fieldB = asString(ev.field_b, '');
        if (docB) repaired.document_b = docB;
        if (fieldB) repaired.field_b = fieldB;
        return repaired;
      }
    }

    return getEvidenceForCase(inconsistency);
  })();

  const normalizedInconsistencyType = toInternalInconsistencyType(inconsistency);
  const normalizedDescription = inconsistency?.description
    ?? asString(
      internal.inconsistency_description,
      repairedEvidence?.explanation ?? 'El expediente no contiene ninguna irregularidad real.',
    );

  const finalizedDocuments = applyDeterministicCaseAdjustments({
    passport: {
      full_name: asString(passport.full_name, normalizedName),
      birth_date: asString(passport.birth_date, '1990-01-01'),
      gender: normalizeGender(passport.gender, normalizedGender),
      nationality: asString(passport.nationality, normalizedNationality),
      number: asString(passport.number, 'BC0000001'),
      issue_date: asString(passport.issue_date, scenarioDates.documentIssueDate),
      expiry_date: asString(passport.expiry_date, scenarioDates.passportExpiryDate),
      photo: asString(passport.photo, normalizedName.slice(0, 2).toUpperCase()),
    },
    visa: desiredKeys.includes('visa') ? withFallbackOptionalDocuments.visa : null,
    flight_ticket: desiredKeys.includes('flight_ticket') ? withFallbackOptionalDocuments.flight_ticket : null,
    hotel_reservation: desiredKeys.includes('hotel_reservation') ? withFallbackOptionalDocuments.hotel_reservation : null,
    bank_statement: desiredKeys.includes('bank_statement') ? withFallbackOptionalDocuments.bank_statement : null,
    work_contract: desiredKeys.includes('work_contract') ? withFallbackOptionalDocuments.work_contract : null,
    invitation_letter: desiredKeys.includes('invitation_letter') ? withFallbackOptionalDocuments.invitation_letter : null,
    medical_certificate: desiredKeys.includes('medical_certificate') ? withFallbackOptionalDocuments.medical_certificate : null,
    minor_permit: desiredKeys.includes('minor_permit') ? withFallbackOptionalDocuments.minor_permit : null,
    customs_declaration: desiredKeys.includes('customs_declaration') ? withFallbackOptionalDocuments.customs_declaration : null,
    luggage_scan: desiredKeys.includes('luggage_scan') ? withFallbackOptionalDocuments.luggage_scan : null,
  }, inconsistency?.id ?? null);

  return {
    internal: {
      inconsistency_id: inconsistency?.id ?? null,
      inconsistency_type: normalizedInconsistencyType,
      inconsistency_description: normalizedDescription,
      guilty: typeof internal.guilty === 'boolean' ? internal.guilty : inconsistency !== null,
      difficulty: normalizeEnumValue(internal.difficulty, DifficultySchema.options, undefined, getDifficulty(day)),
      evidence: repairedEvidence,
    },
    profile: {
      name: normalizedName,
      age: normalizedAge,
      gender: normalizedGender,
      nationality: normalizedNationality,
      stated_purpose: asString(profile.stated_purpose, 'Turismo'),
      demeanor: normalizeEnumValue(profile.demeanor, ['nervous', 'confident', 'friendly', 'evasive', 'aggressive'] as const, {
        nervioso: 'nervous',
        seguro: 'confident',
        amable: 'friendly',
        evasivo: 'evasive',
        agresivo: 'aggressive',
      }),
      backstory: asString(profile.backstory, 'Viaja con una historia sencilla y verosímil para pasar el control.'),
      voice_hint: normalizeEnumValue(profile.voice_hint, VoiceHintSchema.options, {
        hombre: 'male',
        masculino: 'male',
        mujer: 'female',
        femenino: 'female',
      }, genderToVoiceHint(normalizedGender)),
    },
    documents: finalizedDocuments,
    conversation_system_prompt: asString(
      root.conversation_system_prompt,
      [
        `Eres ${normalizedName}, ${normalizedNationality}, ${Math.min(95, Math.max(18, asNumber(profile.age, 34)))} años.`,
        `Estás ante el control migratorio del ${AIRPORT_NAME}, puerta de entrada internacional a ${DESTINATION_CITY}.`,
        `Tu carácter es ${normalizeEnumValue(profile.demeanor, ['nervous', 'confident', 'friendly', 'evasive', 'aggressive'] as const)} y hablas con respuestas breves de 1 a 3 frases, siempre en el idioma del agente.`,
        `Tu género es ${normalizedGender} y tu voz sugerida para el doblaje es ${genderToVoiceHint(normalizedGender)}.`,
        `Tu motivo declarado es ${asString(profile.stated_purpose, 'Turismo')}. Tu historia real es: ${asString(profile.backstory, 'Viaja con una historia sencilla y verosímil para pasar el control.')}.`,
        shouldExposeEvidence(inconsistency)
          ? `Si existe una irregularidad, es esta: ${normalizedDescription ?? 'No existe ninguna irregularidad real en tus documentos.'}.`
          : 'Todos tus documentos deben ser internamente coherentes y tu discurso debe apoyarse en lo que figura en el expediente.',
        'Defiende tu versión sin confesarte. Tu cara al llegar al control debe corresponder a tu carácter base. Si te presionan, puedes pasar a un estado de presión suave y, si te acorralan, a un estado de presión alta. Responde siempre solo con texto hablado, sin gestos, sin acciones entre guiones, sin acotaciones y sin describir expresiones.',
        `Cuando hables de tu destino, estancia, trabajo, contacto o alojamiento, se refieren a ${DESTINATION_CITY}.`,
      ].join(' '),
    ),
  };
};

const validateTraveler = (traveler: Traveler, scenarioDates: ScenarioDates): string | null => {
  const availableOptionalDocs = OPTIONAL_DOCUMENTS.filter((key) => traveler.documents[key] !== null);

  if (availableOptionalDocs.length < 2 || availableOptionalDocs.length > 3) {
    return 'El viajero debe traer entre 2 y 3 documentos opcionales.';
  }

  if (traveler.conversation_system_prompt.length > 1200) {
    return 'El prompt de conversación es demasiado largo.';
  }

  if (!VoiceHintSchema.safeParse(traveler.profile.voice_hint).success) {
    return 'El viajero debe incluir un voice_hint válido.';
  }

  if (traveler.profile.gender !== traveler.documents.passport.gender) {
    return 'El gender del perfil y el del pasaporte deben coincidir.';
  }

  if (!namesShareIdentity(traveler.profile.name, traveler.documents.passport.full_name)) {
    return 'El nombre del perfil visible y el del pasaporte no parecen pertenecer a la misma persona.';
  }

  const inconsistencyId = traveler.internal.inconsistency_id;

  if (traveler.documents.flight_ticket) {
    if (!namesShareIdentity(traveler.documents.flight_ticket.ticket_name, traveler.documents.passport.full_name)) {
      return 'El nombre del billete no pertenece aparentemente a la misma persona del pasaporte.';
    }

    if (traveler.documents.flight_ticket.passport_number !== traveler.documents.passport.number) {
      return 'El billete debe reflejar el mismo número de pasaporte que el pasaporte principal.';
    }

    if (inconsistencyId !== 1 && normalizeComparableString(traveler.documents.flight_ticket.ticket_name) !== normalizeComparableString(traveler.documents.passport.full_name)) {
      return 'El nombre del billete debe coincidir exactamente con el del pasaporte salvo que el caso seleccionado sea un desajuste de nombre.';
    }
  }

  if (traveler.documents.hotel_reservation) {
    if (!namesShareIdentity(traveler.documents.hotel_reservation.reservation_name, traveler.documents.passport.full_name)) {
      return 'La reserva hotelera no está a nombre de la misma persona del pasaporte.';
    }

    if (traveler.documents.hotel_reservation.passport_number !== traveler.documents.passport.number) {
      return 'La reserva hotelera debe reflejar el mismo número de pasaporte que el pasaporte principal.';
    }

    if (normalizeComparableString(traveler.documents.hotel_reservation.reservation_name) !== normalizeComparableString(traveler.documents.passport.full_name)) {
      return 'La reserva hotelera debe mantener exactamente el mismo nombre que el pasaporte.';
    }
  }

  if (traveler.documents.visa) {
    if (!namesShareIdentity(traveler.documents.visa.full_name, traveler.documents.passport.full_name)) {
      return 'El nombre del visado no pertenece aparentemente a la misma persona del pasaporte.';
    }

    if (traveler.documents.visa.passport_number !== traveler.documents.passport.number) {
      return 'El visado debe reflejar el mismo número de pasaporte que el pasaporte principal.';
    }

    if (normalizeComparableString(traveler.documents.visa.full_name) !== normalizeComparableString(traveler.documents.passport.full_name)) {
      return 'El visado debe mantener exactamente el mismo nombre que el pasaporte.';
    }

    if (inconsistencyId !== 2 && traveler.documents.visa.birth_date !== traveler.documents.passport.birth_date) {
      return 'La fecha de nacimiento del visado debe coincidir con la del pasaporte salvo en el caso específico de desajuste de nacimiento.';
    }
  }

  if (traveler.documents.flight_ticket && inconsistencyId !== 4 && traveler.documents.flight_ticket.destination !== DESTINATION_CITY) {
    return `El billete debe apuntar a ${DESTINATION_CITY}.`;
  }

  if (traveler.documents.hotel_reservation && inconsistencyId !== 4 && traveler.documents.hotel_reservation.city !== DESTINATION_CITY) {
    return `La reserva hotelera debe estar en ${DESTINATION_CITY}.`;
  }

  if (inconsistencyId === 4) {
    if (!traveler.documents.flight_ticket || !traveler.documents.hotel_reservation) {
      return 'El caso de ciudad distinta requiere billete y reserva hotelera.';
    }

    if (traveler.documents.flight_ticket.destination === traveler.documents.hotel_reservation.city) {
      return 'El caso de ciudad distinta debe mostrar ciudades diferentes entre billete y reserva hotelera.';
    }

    if (traveler.documents.flight_ticket.layovers.length > 0) {
      return 'El caso de ciudad distinta no debe incluir escalas porque la incoherencia depende de la ausencia de conexión.';
    }
  }

  if (traveler.documents.invitation_letter && !traveler.documents.invitation_letter.address.includes(DESTINATION_CITY)) {
    return `La carta de invitación debe mencionar una dirección en ${DESTINATION_CITY}.`;
  }

  if (traveler.documents.work_contract && traveler.documents.work_contract.country !== DESTINATION_COUNTRY) {
    return `El contrato laboral debe estar vinculado a ${DESTINATION_COUNTRY}.`;
  }

    if (traveler.documents.minor_permit && traveler.documents.minor_permit.destination !== DESTINATION_CITY) {
      return `El permiso de menor debe indicar ${DESTINATION_CITY} como destino.`;
    }

    if (traveler.documents.minor_permit && traveler.profile.age >= 18) {
      return 'Un adulto no puede portar un permiso de menor.';
    }

  if (traveler.documents.flight_ticket && traveler.documents.flight_ticket.date < scenarioDates.arrivalDate) {
    return 'La fecha del billete no puede quedar por detrás de la llegada prevista.';
  }

  if (traveler.documents.hotel_reservation && traveler.documents.hotel_reservation.check_in !== scenarioDates.arrivalDate) {
    return 'La fecha de check-in debe coincidir con la llegada prevista.';
  }

  if (traveler.documents.hotel_reservation && traveler.documents.hotel_reservation.check_out < traveler.documents.hotel_reservation.check_in) {
    return 'La reserva hotelera tiene un rango de fechas inválido.';
  }

  if (traveler.documents.work_contract && traveler.documents.work_contract.start_date < scenarioDates.arrivalDate) {
    return 'La fecha de inicio del contrato debe ser igual o posterior a la llegada.';
  }

  if (traveler.documents.medical_certificate && traveler.documents.medical_certificate.date > scenarioDates.inspectionDate) {
    return 'El certificado médico no puede estar fechado después de la inspección.';
  }

  if (traveler.internal.guilty) {
    if (traveler.internal.inconsistency_id === null) {
      return 'Los casos culpables deben incluir internal.inconsistency_id.';
    }

    const catalogCase = getById(traveler.internal.inconsistency_id);
    if (!catalogCase) {
      return `internal.inconsistency_id (${traveler.internal.inconsistency_id}) no existe en el catálogo.`;
    }

    if (traveler.internal.inconsistency_type !== toInternalInconsistencyType(catalogCase)) {
      return 'internal.inconsistency_type no coincide con la categoría del caso del catálogo.';
    }

    const missingRequiredDocument = catalogCase.documents_required.find((document) => {
      if (document === 'passport') {
        return false;
      }

      return traveler.documents[document as OptionalDocumentKey] === null;
    });

    if (missingRequiredDocument) {
      return `Falta el documento obligatorio ${missingRequiredDocument} para el caso #${catalogCase.id}.`;
    }

    const evidence = traveler.internal.evidence;
    if (shouldExposeEvidence(catalogCase)) {
      if (!evidence || !evidence.document_a || !evidence.field_a || !evidence.explanation) {
        return 'Los casos culpables deben incluir internal.evidence con los campos document_a, field_a y explanation para que la contradicción sea verificable en el expediente.';
      }

      const knownDocKeys: ReadonlyArray<string> = ['passport', ...OPTIONAL_DOCUMENTS];
      if (!knownDocKeys.includes(evidence.document_a)) {
        return `internal.evidence.document_a (${evidence.document_a}) no corresponde a un documento conocido del expediente.`;
      }
      if (evidence.document_b && !knownDocKeys.includes(evidence.document_b)) {
        return `internal.evidence.document_b (${evidence.document_b}) no corresponde a un documento conocido del expediente.`;
      }
    } else if (isConversationDrivenCase(catalogCase) && evidence) {
      return 'Los casos guiados por conversación no deben exponer internal.evidence porque el error debe probarse durante el interrogatorio.';
    }
  } else {
    if (traveler.internal.inconsistency_id !== null) {
      return 'Los viajeros limpios deben tener internal.inconsistency_id=null.';
    }
  }

  return null;
};

const buildSystemPrompt = (
  difficulty: Difficulty,
  inconsistency: InconsistencyDefinition | null,
  slotPlanConstraints?: {
    name: string;
    gender: string;
    nationality: string;
    age: number;
    demeanor: string;
    stated_purpose: string;
    backstory: string;
  },
): string => {
  const isClean = inconsistency === null;

  const planConstraintBlock = slotPlanConstraints
    ? [
        'IDENTIDAD FIJADA (no modificar estos campos bajo ninguna circunstancia):',
        `- Nombre del viajero: "${slotPlanConstraints.name}" — DEBE ser exactamente este nombre en profile.name y passport.full_name.`,
        `- Género: "${slotPlanConstraints.gender}" — profile.gender y passport.gender deben ser "${slotPlanConstraints.gender}".`,
        `- Nacionalidad: "${slotPlanConstraints.nationality}" — profile.nationality y passport.nationality deben ser "${slotPlanConstraints.nationality}".`,
        `- Edad: ${slotPlanConstraints.age} — profile.age debe ser exactamente ${slotPlanConstraints.age} (±1 es aceptable solo si el modelo de IA lo require por coherencia de fechas).`,
        `- Comportamiento: "${slotPlanConstraints.demeanor}" — profile.demeanor DEBE ser "${slotPlanConstraints.demeanor}".`,
        `- Motivo declarado: "${slotPlanConstraints.stated_purpose}" — profile.stated_purpose debe incluir esta información.`,
        `- Trasfondo: "${slotPlanConstraints.backstory}" — profile.backstory debe ser coherente con este trasfondo.`,
      ].join(' ')
    : null;

  return [
    `Eres un generador de personajes para un juego de control de fronteras en ${AIRPORT_NAME}.`,
    `Contexto: entradas internacionales a ${DESTINATION_COUNTRY}, viajeros de cualquier nacionalidad y normativa migratoria local.`,
    'Responde ÚNICAMENTE con el JSON del schema. Sin explicaciones. Sin markdown. Sin texto extra.',
    planConstraintBlock,
    isClean
      ? 'INSTRUCCIÓN: Genera un viajero completamente limpio. Todos sus documentos son coherentes entre sí y con lo que dice. No hay ninguna inconsistencia. El jugador debe poder aprobarlo.'
      : [
          `INSTRUCCIÓN: Genera un viajero para el CASO #${inconsistency.id}.`,
          `NOMBRE DEL CASO: ${inconsistency.title}`,
          `DEFINICIÓN EXACTA: ${inconsistency.description}`,
          `DOCUMENTOS OBLIGATORIOS: ${inconsistency.documents_required.join(', ')}`,
          inconsistency.documents_optional?.length
            ? `DOCUMENTOS OPCIONALES: ${inconsistency.documents_optional.join(', ')}`
            : null,
          'REGLAS CRÍTICAS:',
          '- La inconsistencia DEBE ser visible comparando los documentos listados en DOCUMENTOS OBLIGATORIOS.',
          '- No puede requerir conocimiento externo al juego.',
          '- No la hagas obvia. El jugador debe tener que mirar con atención o preguntar.',
          '- Incluye TODOS los documentos obligatorios en el objeto documents del viajero.',
          '- No inventes campos fuera del schema.',
          '- Todos los campos deben estar rellenos con valores concretos y plausibles; evita vaguedades como "desconocido", "N/A" o placeholders.',
          '- El número de pasaporte DEBE ser el mismo en todos los documentos que lo incluyan (billete, reserva, visado, etc.).',
          '- El dossier completo debe parecer emitido por entidades reales y coherentes entre sí: nombres, fechas, ciudades, importes y motivos de viaje deben sonar específicos y verificables.',
        ]
          .filter(Boolean)
          .join(' '),
    `Nivel de dificultad general del personaje: ${difficulty}.`,
  ].filter(Boolean).join(' ');
};

const buildTravelerPrompt = (
  difficulty: Difficulty,
  inconsistency: InconsistencyDefinition | null,
  selectedOptionalDocuments: OptionalDocumentKey[],
  scenarioDates: ScenarioDates,
  slotPlanConstraints?: {
    name: string;
    gender: string;
    nationality: string;
    age: number;
    demeanor: string;
    stated_purpose: string;
    backstory: string;
  },
): string => {
  const isClean = inconsistency === null;
  const internalType = toInternalInconsistencyType(inconsistency);

  const planReinforcement = slotPlanConstraints
    ? [
        `RECORDATORIO CRÍTICO: El viajero DEBE llamarse "${slotPlanConstraints.name}", ser de nacionalidad "${slotPlanConstraints.nationality}", género "${slotPlanConstraints.gender}", ${slotPlanConstraints.age} años, comportamiento "${slotPlanConstraints.demeanor}".`,
        `Su motivo declarado debe ser coherente con: "${slotPlanConstraints.stated_purpose}". Su historia de fondo debe reflejar: "${slotPlanConstraints.backstory}".`,
        'Estos valores son vinculantes y no pueden ser modificados por el modelo.',
      ].join(' ')
    : null;

  return [
    planReinforcement,
    `El viajero debe traer pasaporte y exactamente ${selectedOptionalDocuments.length} documentos adicionales del catálogo opcional.`,
    `Documentos opcionales que debes incluir como no nulos: ${selectedOptionalDocuments.join(', ')}.`,
    `La escena ocurre en el ${AIRPORT_NAME}, en el control de entrada internacional a ${DESTINATION_CITY}.`,
    `La fecha real de inspección es ${scenarioDates.inspectionDate}. La llegada del viajero ocurre el ${scenarioDates.arrivalDate} y su salida prevista el ${scenarioDates.departureDate}.`,
    'En documents debes incluir siempre todas las claves del schema. Si un documento opcional no existe, su valor debe ser null.',
    'Todos los textos del juego deben estar en español.',
    'El código usa nombres de campos en inglés, pero el contenido visible puede sonar natural en español.',
    'Genera datos concretos, ricos y consistentes: nombres completos plausibles, números de documento realistas, hoteles específicos, empresas específicas, direcciones creíbles, importes redondeados con sentido y detalles que ayuden a inspeccionar el caso.',
     'Cada documento debe aportar información útil y verificable. Evita textos genéricos, repetitivos o vacíos.',
     'Los documentos de viaje nominales (visado, billete, hotel) deben incluir datos del pasajero que permitan verificar identidad: nombre completo y número de pasaporte; el visado también debe incluir fecha de nacimiento.',
    `Si un documento habla de destino, hotel, dirección de anfitrión, contrato de trabajo, permiso de menor o cualquier llegada, debe apuntar a ${DESTINATION_CITY}.`,
    'Las fechas deben ser coherentes con el día actual de inspección. No uses fechas pasadas arbitrarias que contradigan la escena.',
    'Mantén la coherencia fuerte entre profile, passport y el resto del expediente: edad, género, nombre, propósito del viaje y nacionalidad deben encajar sin contradicciones accidentales.',
    'La foto del pasaporte debe ser unas iniciales estilizadas, no una descripción larga.',
    'El conversation_system_prompt debe ser corto, útil, de menos de 180 palabras y aproximadamente menos de 900 caracteres.',
    'Ese conversation_system_prompt debe describir al viajero como personaje: quién es, cómo habla, qué intenta ocultar, cómo reacciona al llegar al control, cómo reacciona bajo presión suave, cómo reacciona bajo presión alta y cuál es su historia real.',
    'Haz que el perfil tenga objetivos, tics verbales o pequeñas manías distintas para que cada interrogatorio se sienta diferente.',
    'Si el viajero es culpable, debe conocer su punto débil y tratar de protegerlo. Si es inocente, su personalidad puede parecer sospechosa sin ser incoherente.',
    'El viajero debe responder de forma breve, con 1 a 3 frases por turno.',
    'No uses emojis. No escribas acotaciones teatrales, acciones entre asteriscos, onomatopeyas ni gestos entre paréntesis. Devuelve solo texto hablado por el viajero.',
    'No traduzcas al español los valores enum internos ni visa.type.',
    'Reglas por documento: bank_statement.recent_movements debe contener exactamente 3 movimientos; customs_declaration.declared_valuables debe ser una lista corta y creíble; luggage_scan.items_detected debe listar objetos concretos y no frases largas.',
    'Si el viajero tiene hotel, reserva, trabajo o invitación, esos documentos deben nombrar entidades concretas y no genéricas.',
    isClean
      ? 'El caso es inocente. No generes contradicción real, solo un comportamiento o contexto que invite a sospechar sin convertirlo en culpable. Deja internal.inconsistency_id en null, internal.inconsistency_type en null y internal.evidence sin incluir.'
      : getEvidenceInstruction(inconsistency, internalType),
    !isClean && selectedOptionalDocuments.includes('luggage_scan')
      ? 'Si incluyes luggage_scan, devuelve un objeto con bag_count, items_detected y notes opcional. Los items_detected deben marcar suspicious=true en los objetos relevantes y declared=false si no aparecen en customs_declaration.'
      : null,
    'Evita repetir viajeros genéricos. Haz que cada caso se sienta diferente y divertido de investigar.',
    `Nivel de dificultad: ${difficulty}.`,
  ].filter(Boolean).join(' ');
};

const getTravelerModelForProvider = (provider: AIProvider): string => {
  switch (provider) {
    case 'groq':
      return process.env.GROQ_MODEL_TRAVELER ?? process.env.GROQ_MODEL ?? 'groq-default';
    case 'openrouter':
      return process.env.OPENROUTER_MODEL_TRAVELER ?? process.env.OPENROUTER_MODEL ?? 'openrouter-default';
    case 'cerebras':
      return process.env.CEREBRAS_MODEL_TRAVELER ?? process.env.CEREBRAS_MODEL ?? 'cerebras-default';
    case 'vercel':
      return process.env.VERCEL_MODEL_TRAVELER ?? process.env.VERCEL_MODEL ?? 'vercel-default';
    case 'local':
      return process.env.BACKUP_PROVIDER_MODEL_TRAVELER ?? process.env.BACKUP_PROVIDER_MODEL ?? 'local-default';
    case 'sin conexión':
      return 'sin modelo';
  }
};

export const POST = withRouteLogger(async (request) => {
  const json = (await request.json().catch(() => null)) as unknown;
  const parsedBody = RequestSchema.safeParse(json ?? {});

  if (!parsedBody.success) {
    request.log.error('Solicitud inválida para generar viajero.', { errors: parsedBody.error.format() });
    return NextResponse.json({ error: 'Solicitud inválida para generar viajero.' }, { status: 400 });
  }

  const day = parsedBody.data.day;
  const difficulty = parsedBody.data.difficulty ?? getDifficulty(day);
  const slotPlan = parsedBody.data.slot_plan;

  const selectedCase = slotPlan
    ? (slotPlan.case_id !== null ? getById(slotPlan.case_id) ?? null : null)
    : parsedBody.data.force_clean
      ? null
      : parsedBody.data.inconsistency_id
        ? getById(parsedBody.data.inconsistency_id) ?? null
        : selectInconsistency(day);
  const selectedOptionalDocuments = selectOptionalDocumentKeys(selectedCase);

  const slotPlanConstraints = slotPlan
    ? {
        name: slotPlan.name,
        gender: slotPlan.gender,
        nationality: slotPlan.nationality,
        age: slotPlan.age,
        demeanor: slotPlan.demeanor,
        stated_purpose: slotPlan.stated_purpose,
        backstory: slotPlan.backstory,
      }
    : undefined;

  const preferredProvider = parsedBody.data.preferred_provider as AIProvider | undefined;
  const scenarioDates = getScenarioDates(day);
  const flags = getFeatureFlags();

  try {
    const systemPrompt = buildSystemPrompt(difficulty, selectedCase, slotPlanConstraints);
    const baseTravelerPrompt = buildTravelerPrompt(difficulty, selectedCase, selectedOptionalDocuments, scenarioDates, slotPlanConstraints);
    const repairObject = (raw: unknown) => repairTravelerObject(raw, selectedCase?.id ?? null, day);
    const effectivePreferredProvider = preferredProvider && preferredProvider !== 'sin conexión' ? preferredProvider : undefined;
    let lastSemanticError: string | null = null;
    let result: Awaited<ReturnType<typeof aiService.generateObject<typeof TravelerSchema>>> | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const semanticRetryPrompt = lastSemanticError
        ? `${baseTravelerPrompt}\n\nLa respuesta anterior no pasó la validación semántica del juego. Genera el expediente completo desde cero corrigiendo este problema: ${lastSemanticError}. Conserva el formato JSON exacto y mantén toda la coherencia documental.`
        : baseTravelerPrompt;

      result = await aiService.generateObject({
        schema: TravelerSchema,
        purpose: 'traveler',
        system: systemPrompt,
        prompt: semanticRetryPrompt,
        repairObject,
        preferredProvider: effectivePreferredProvider,
        log: request.log,
      });

      const resolvedTravelerName = resolveTravelerName(
        result.object.profile.name,
        result.object.documents.passport.full_name,
      ) ?? generateTravelerName(result.object.profile.nationality);

      if (isPlaceholderTravelerName(result.object.profile.name)) {
        result.object.profile.name = resolvedTravelerName;
      }

      if (isPlaceholderTravelerName(result.object.documents.passport.full_name)) {
        result.object.documents.passport.full_name = resolvedTravelerName;
      }

      if (result.object.documents.flight_ticket && isPlaceholderTravelerName(result.object.documents.flight_ticket.ticket_name)) {
        result.object.documents.flight_ticket.ticket_name = resolvedTravelerName;
      }

      if (result.object.documents.hotel_reservation && isPlaceholderTravelerName(result.object.documents.hotel_reservation.reservation_name)) {
        result.object.documents.hotel_reservation.reservation_name = resolvedTravelerName;
      }

      if (result.object.documents.minor_permit && isPlaceholderTravelerName(result.object.documents.minor_permit.minor_name)) {
        result.object.documents.minor_permit.minor_name = resolvedTravelerName;
      }

      if (slotPlanConstraints) {
        result.object.profile.name = slotPlanConstraints.name;
        result.object.profile.gender = slotPlanConstraints.gender as Gender;
        result.object.profile.nationality = slotPlanConstraints.nationality;
        result.object.profile.age = slotPlanConstraints.age;
        result.object.profile.demeanor = slotPlanConstraints.demeanor as Traveler['profile']['demeanor'];
        result.object.profile.stated_purpose = slotPlanConstraints.stated_purpose;
        result.object.profile.backstory = slotPlanConstraints.backstory;
        result.object.documents.passport.full_name = slotPlanConstraints.name;
        result.object.documents.passport.gender = slotPlanConstraints.gender as Gender;
        result.object.documents.passport.nationality = slotPlanConstraints.nationality;
      }

      const passportNumber = result.object.documents.passport.number;
      const fullName = result.object.documents.passport.full_name;
      const currentInconsistencyId = result.object.internal.inconsistency_id;

      if (result.object.documents.flight_ticket) {
        result.object.documents.flight_ticket.passport_number = passportNumber;
        if (currentInconsistencyId !== 1) {
          result.object.documents.flight_ticket.ticket_name = fullName;
        }
      }
      if (result.object.documents.hotel_reservation) {
        result.object.documents.hotel_reservation.passport_number = passportNumber;
        result.object.documents.hotel_reservation.reservation_name = fullName;
      }
      if (result.object.documents.visa) {
        result.object.documents.visa.passport_number = passportNumber;
        result.object.documents.visa.full_name = fullName;
      }

      const semanticError = validateTraveler(result.object, scenarioDates);

      if (!semanticError) {
        break;
      }

      lastSemanticError = semanticError;
      result = null;
    }

    if (!result) {
      throw new Error(lastSemanticError ?? 'No se pudo generar un expediente válido para el viajero.');
    }

    const portrait = await generatePassportPhoto({
      travelerName: result.object.profile.name,
      nationality: result.object.profile.nationality,
      gender: result.object.profile.gender,
      ageRange: result.object.profile.age >= 60 ? 'elderly' : result.object.profile.age >= 30 ? 'adult' : 'young adult',
      demeanor: result.object.profile.demeanor,
      purpose: result.object.profile.stated_purpose,
      backstory: result.object.profile.backstory,
      log: request.log,
    });

    return NextResponse.json(
      {
        traveler: result.object,
        provider_used: result.providerUsed,
        text_model_used: getTravelerModelForProvider(result.providerUsed),
        scenario: {
          today: scenarioDates.today,
          inspectionDate: scenarioDates.inspectionDate,
          arrivalDate: scenarioDates.arrivalDate,
          departureDate: scenarioDates.departureDate,
        },
        media: {
          audioEnabled: flags.audioEnabled,
          imageEnabled: flags.imageEnabled,
          audioModel: flags.audioModel,
          imageModel: flags.imageModel,
        },
        portrait,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-AI-Provider': result.providerUsed,
          'X-AI-Model': getTravelerModelForProvider(result.providerUsed),
          'X-AI-Attempted-Providers': result.fallbackMetadata.attemptedProviders.join(','),
          'X-AI-Failed-Providers': result.fallbackMetadata.failedProviders.join(','),
        },
      },
    );
  } catch (error) {
    request.log.error('Error al generar viajero.', { error });
    return NextResponse.json(
      {
        error: 'Todos los proveedores fallaron al generar el expediente del viajero.',
      },
      { status: 503 },
    );
  }
});
