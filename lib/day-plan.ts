import type { Demeanor, Gender } from '@/schemas/traveler';
import { generateTravelerName } from '@/lib/traveler-name';
import { selectInconsistency } from '@/lib/difficulty';

export type VisualIdentity = {
  age_range: string;
  nationality: string;
  demeanor: Demeanor;
  gender: Gender;
};

export type DaySlotPlan = {
  slot_index: number;
  case_id: number | null;
  name: string;
  gender: Gender;
  nationality: string;
  age: number;
  demeanor: Demeanor;
  stated_purpose: string;
  backstory: string;
  visual_identity: VisualIdentity;
};

const DEMEANOR_OPTIONS: Demeanor[] = ['nervous', 'confident', 'friendly', 'evasive', 'aggressive'];

const NATIONALITY_POOL: string[] = [
  'España', 'México', 'Argentina', 'Colombia', 'Francia', 'Alemania',
  'Italia', 'Rumanía', 'Polonia', 'Marruecos', 'Argelia', 'Senegal',
  'Brasil', 'China', 'Japón', 'Corea del Sur', 'Turquía', 'Rusia',
  'Reino Unido', 'Estados Unidos', 'Canada', 'Australia', 'Nigeria',
  'Egipto', 'Jordania', 'Portugal', 'Países Bajos', 'Bélgica', 'Suecia',
];

const GENDER_OPTIONS: Gender[] = ['male', 'female'];

const PURPOSE_BY_DEMEANOR: Record<Demeanor, string[]> = {
  nervous: ['Turismo familiar', 'Visita médica', 'Estudio de idiomas', 'Conferencia académica'],
  confident: ['Negocios', 'Inversión empresarial', 'Consultoría', 'Asistencia a feria comercial'],
  friendly: ['Vacaciones', 'Visita a amigos', 'Luna de miel', 'Intercambio cultural'],
  evasive: ['Turismo', 'Visita de trabajo', 'Tránsito', 'Motivos personales'],
  aggressive: ['Trabajo', 'Reunión urgente', 'Trámite administrativo', 'Repatriación de familiar'],
};

const BACKSTORY_BY_DEMEANOR: Record<Demeanor, string[]> = {
  nervous: [
    'Viajero primerizo que teme cometer algún error en el control y lleva los documentos muy ordenados.',
    'Ha tenido problemas burocráticos en viajes anteriores y prefiere no llamar la atención.',
  ],
  confident: [
    'Viajero frecuente acostumbrado a los controles internacionales, mantiene la calma y responde con precisión.',
    'Profesional que viaja varias veces al año; conoce el procedimiento y no se inmuta.',
  ],
  friendly: [
    'Turista entusiasta que aprovecha cualquier momento para hablar de su destino favorito.',
    'Persona abierta que disfruta conociendo gente nueva y comparte su itinerario con naturalidad.',
  ],
  evasive: [
    'Responde solo lo imprescindible y desvía las preguntas sin dar explicaciones innecesarias.',
    'Viajero discreto que prefiere mantener sus planes privados; no miente, pero tampoco elabora.',
  ],
  aggressive: [
    'Considera que el control es una pérdida de tiempo y lo hace evidente con su actitud.',
    'Reacciona con impaciencia ante preguntas que percibe como obvias o repetitivas.',
  ],
};

const AGE_RANGES: Array<{ min: number; max: number; label: string }> = [
  { min: 22, max: 29, label: 'early-20s to late-20s' },
  { min: 30, max: 39, label: 'early-30s to late-30s' },
  { min: 40, max: 49, label: 'early-40s to late-40s' },
  { min: 50, max: 62, label: 'early-50s to early-60s' },
];

const pickRandom = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)] as T;

const pickAgeRange = (age: number): string => {
  const matched = AGE_RANGES.find((r) => age >= r.min && age <= r.max);
  return matched?.label ?? `${age} years old`;
};

const buildSlotPlan = (
  slotIndex: number,
  caseId: number | null,
  nationality: string,
  gender: Gender,
  demeanor: Demeanor,
  age: number,
): DaySlotPlan => {
  const name = generateTravelerName(nationality);
  const stated_purpose = pickRandom(PURPOSE_BY_DEMEANOR[demeanor]);
  const backstory = pickRandom(BACKSTORY_BY_DEMEANOR[demeanor]);

  return {
    slot_index: slotIndex,
    case_id: caseId,
    name,
    gender,
    nationality,
    age,
    demeanor,
    stated_purpose,
    backstory,
    visual_identity: {
      age_range: pickAgeRange(age),
      nationality,
      demeanor,
      gender,
    },
  };
};

export const buildDaySlotPlans = (caseIds: Array<number | null>): DaySlotPlan[] => {
  return caseIds.map((caseId, slotIndex) => {
    const nationality = pickRandom(NATIONALITY_POOL);
    const gender = pickRandom(GENDER_OPTIONS);
    const demeanor = pickRandom(DEMEANOR_OPTIONS);
    const ageRange = pickRandom(AGE_RANGES);
    const age = Math.floor(Math.random() * (ageRange.max - ageRange.min + 1)) + ageRange.min;
    return buildSlotPlan(slotIndex, caseId, nationality, gender, demeanor, age);
  });
};

export const planDayCaseIds = (
  day: number,
  recentCaseIdsByDay: number[][],
): Array<number | null> => {
  const TRAVELERS_PER_DAY = 6;
  const rollingExcludedIds = [...recentCaseIdsByDay.flat()];
  const plannedCases: Array<number | null> = [];

  for (let index = 0; index < TRAVELERS_PER_DAY; index += 1) {
    const selectedCase = selectInconsistency(day, rollingExcludedIds);
    plannedCases.push(selectedCase?.id ?? null);

    if (selectedCase) {
      rollingExcludedIds.push(selectedCase.id);
    }
  }

  return plannedCases;
};
