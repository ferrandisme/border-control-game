import type { Difficulty } from '@/schemas/traveler';

export type InconsistencyCategory =
  | 'doc_vs_doc'
  | 'declaration'
  | 'speech_vs_doc'
  | 'knowledge_gap'
  | 'timeline'
  | 'visual';

export interface InconsistencyDefinition {
  id: number;
  category: InconsistencyCategory;
  difficulty: Difficulty;
  title: string;
  description: string;
  documents_required: string[];
  documents_optional?: string[];
}

export const CONVERSATION_DRIVEN_CATEGORIES: ReadonlyArray<InconsistencyCategory> = [
  'declaration',
  'speech_vs_doc',
  'knowledge_gap',
];

export const RELIABLY_VERIFIABLE_CATEGORIES: ReadonlyArray<InconsistencyCategory> = [
  'doc_vs_doc',
  'timeline',
  'visual',
];

export const INCONSISTENCY_CATALOG: InconsistencyDefinition[] = [
  {
    id: 1,
    category: 'doc_vs_doc',
    difficulty: 'easy',
    title: 'Nombre diferente en billete y pasaporte',
    description: 'El nombre en el billete de avión difiere del pasaporte (inicial cambiada, guión añadido, orden de apellidos invertido). Debe ser una diferencia sutil, no un nombre completamente distinto.',
    documents_required: ['passport', 'flight_ticket'],
  },
  {
    id: 2,
    category: 'doc_vs_doc',
    difficulty: 'easy',
    title: 'Fecha de nacimiento distinta en pasaporte y visado',
    description: 'La fecha de nacimiento en el visado no coincide exactamente con la del pasaporte. Diferencia de 1 día, 1 mes, o año transpuesto.',
    documents_required: ['passport', 'visa'],
  },
  {
    id: 3,
    category: 'doc_vs_doc',
    difficulty: 'easy',
    title: 'Visado de turista con contrato de trabajo',
    description: 'El viajero porta un visado de tipo turista pero también lleva un contrato de trabajo firmado en el país de destino con fecha de inicio próxima.',
    documents_required: ['visa', 'work_contract'],
  },
  {
    id: 4,
    category: 'doc_vs_doc',
    difficulty: 'easy',
    title: 'Hotel en ciudad diferente al destino del vuelo',
    description: 'El billete de avión llega a una ciudad, pero la reserva de hotel está en una ciudad diferente del mismo país sin que haya ningún vuelo de conexión.',
    documents_required: ['flight_ticket', 'hotel_reservation'],
  },
  {
    id: 5,
    category: 'doc_vs_doc',
    difficulty: 'medium',
    title: 'Visado caducado en la fecha del viaje',
    description: 'La fecha de caducidad del visado es anterior a la fecha del vuelo. La diferencia debe ser de pocos días para que no sea inmediatamente obvia.',
    documents_required: ['visa', 'flight_ticket'],
  },
  {
    id: 6,
    category: 'doc_vs_doc',
    difficulty: 'medium',
    title: 'Check-out del hotel antes del vuelo de vuelta',
    description: 'La fecha de check-out de la reserva de hotel es anterior en varios días a la fecha del vuelo de vuelta, dejando al viajero sin alojamiento declarado.',
    documents_required: ['hotel_reservation', 'flight_ticket'],
  },
  {
    id: 7,
    category: 'doc_vs_doc',
    difficulty: 'medium',
    title: 'Carta de invitación de contacto desconocido',
    description: 'La carta de invitación está firmada por una persona que no aparece como contacto ni familiar en ningún otro documento. El viajero dice viajar a ver a esa persona.',
    documents_required: ['invitation_letter', 'passport'],
  },
  {
    id: 8,
    category: 'doc_vs_doc',
    difficulty: 'hard',
    title: 'Permiso de menor firmado por no tutor',
    description: 'El menor viaja con permiso, pero el firmante del permiso no coincide con los tutores que aparecen en el pasaporte del menor.',
    documents_required: ['passport', 'minor_permit'],
  },
  {
    id: 9,
    category: 'doc_vs_doc',
    difficulty: 'hard',
    title: 'Extracto bancario con cargos previos en el destino',
    description: 'El viajero declara que es su primera visita, pero el extracto bancario muestra cargos realizados en el país de destino hace 2-3 meses.',
    documents_required: ['bank_statement', 'passport'],
  },
  {
    id: 10,
    category: 'doc_vs_doc',
    difficulty: 'medium',
    title: 'Sin billete de vuelta con visado de turista',
    description: 'El viajero tiene visado de turista (estancia limitada) pero no presenta ningún billete de vuelta ni de salida del país.',
    documents_required: ['visa', 'flight_ticket'],
  },
  {
    id: 11,
    category: 'declaration',
    difficulty: 'easy',
    title: 'Dice que se hospeda con familia pero tiene hotel',
    description: 'En la conversación el viajero afirma hospedarse en casa de un familiar, pero porta una reserva de hotel pagada a su nombre.',
    documents_required: ['hotel_reservation'],
  },
  {
    id: 12,
    category: 'declaration',
    difficulty: 'medium',
    title: 'Dice ser primera visita pero tiene cargos previos',
    description: 'El viajero afirma que es la primera vez que visita el país, pero el extracto bancario muestra transacciones en comercios locales de ese país en fechas anteriores.',
    documents_required: ['bank_statement'],
  },
  {
    id: 13,
    category: 'declaration',
    difficulty: 'easy',
    title: 'Efectivo declarado no coincide con declaración aduanas',
    description: 'El viajero declara verbalmente llevar 300-500€. La declaración de aduanas firmada indica una cantidad entre 2.000€ y 4.000€.',
    documents_required: ['customs_declaration'],
  },
  {
    id: 14,
    category: 'declaration',
    difficulty: 'medium',
    title: 'Dice que la empresa le paga el viaje pero el billete es personal',
    description: 'El viajero tiene carta de trabajo o contrato que menciona viaje en comisión de servicio, pero el billete de avión está comprado con su tarjeta bancaria personal.',
    documents_required: ['flight_ticket', 'bank_statement', 'work_contract'],
  },
  {
    id: 15,
    category: 'declaration',
    difficulty: 'easy',
    title: 'Dice viajar solo pero el billete es doble',
    description: 'El viajero asegura viajar solo. El billete de avión muestra dos pasajeros en la misma reserva, con el segundo nombre diferente.',
    documents_required: ['flight_ticket'],
  },
  {
    id: 16,
    category: 'declaration',
    difficulty: 'easy',
    title: 'Dice quedarse una semana, hotel reservado un mes',
    description: 'El viajero afirma que su estancia será de 5-7 días. La reserva de hotel muestra un check-out 25-30 días después.',
    documents_required: ['hotel_reservation'],
  },
  {
    id: 17,
    category: 'speech_vs_doc',
    difficulty: 'easy',
    title: 'Nombre del hotel diferente al de la reserva',
    description: 'Durante la conversación el viajero menciona el nombre de su hotel, pero el nombre que dice no coincide con el de la reserva que porta.',
    documents_required: ['hotel_reservation'],
  },
  {
    id: 18,
    category: 'speech_vs_doc',
    difficulty: 'medium',
    title: 'Dirección de trabajo diferente a la del contrato',
    description: 'El viajero menciona en qué zona o dirección está su lugar de trabajo. La dirección en el contrato es diferente a la que describe.',
    documents_required: ['work_contract'],
  },
  {
    id: 19,
    category: 'speech_vs_doc',
    difficulty: 'medium',
    title: 'Escala que no existe en el billete',
    description: 'El viajero menciona haber hecho una escala en una ciudad concreta. El billete de avión es un vuelo directo sin escalas.',
    documents_required: ['flight_ticket'],
  },
  {
    id: 20,
    category: 'speech_vs_doc',
    difficulty: 'easy',
    title: 'Objeto de valor no declarado en aduanas',
    description: 'Durante la conversación el viajero menciona espontáneamente traer un regalo caro o un objeto de valor (joya, electrónico caro). No figura en la declaración de aduanas.',
    documents_required: ['customs_declaration'],
  },
  {
    id: 21,
    category: 'speech_vs_doc',
    difficulty: 'easy',
    title: 'Tipo de visado confundido',
    description: 'El viajero afirma tener un visado de trabajo cuando en realidad porta un visado de tránsito, turista o estudiante.',
    documents_required: ['visa'],
  },
  {
    id: 22,
    category: 'knowledge_gap',
    difficulty: 'medium',
    title: 'No conoce su ciudad de residencia',
    description: 'El viajero afirma vivir en una ciudad concreta pero no puede nombrar un barrio, calle conocida, o punto de referencia básico de esa ciudad cuando se le pregunta.',
    documents_required: ['passport'],
  },
  {
    id: 23,
    category: 'knowledge_gap',
    difficulty: 'medium',
    title: 'No conoce a su responsable en el trabajo',
    description: 'El viajero porta contrato de trabajo pero no recuerda o no sabe el nombre de su jefe directo o supervisor en la empresa.',
    documents_required: ['work_contract'],
  },
  {
    id: 24,
    category: 'knowledge_gap',
    difficulty: 'hard',
    title: 'No conoce su universidad',
    description: 'El viajero tiene visado de estudiante pero no sabe el nombre de su facultad, departamento, o no puede nombrar ningún profesor cuando se le pregunta.',
    documents_required: ['visa'],
  },
  {
    id: 25,
    category: 'knowledge_gap',
    difficulty: 'hard',
    title: 'No conoce al firmante de su carta de invitación',
    description: 'La carta de invitación está firmada por un "amigo" o "familiar". Cuando se le pregunta, el viajero no sabe el apellido, la dirección exacta o cualquier detalle básico de esa persona.',
    documents_required: ['invitation_letter'],
  },
  {
    id: 26,
    category: 'timeline',
    difficulty: 'hard',
    title: 'Pasaporte expedido después del visado',
    description: 'La fecha de expedición del pasaporte es posterior a la fecha de emisión del visado que lleva dentro. Imposible legalmente.',
    documents_required: ['passport', 'visa'],
  },
  {
    id: 27,
    category: 'timeline',
    difficulty: 'hard',
    title: 'Vuelo antes de que el visado sea válido',
    description: 'El visado tiene una fecha de inicio de validez posterior a la fecha del vuelo. El viajero llegó antes de que su visado fuera legal.',
    documents_required: ['visa', 'flight_ticket'],
  },
  {
    id: 28,
    category: 'timeline',
    difficulty: 'medium',
    title: 'Contrato ya activo pero dice que viene a firmarlo',
    description: 'El contrato de trabajo tiene fecha de inicio hace 2-4 meses. El viajero dice que viene al país precisamente a firmarlo y comenzar.',
    documents_required: ['work_contract'],
  },
  {
    id: 29,
    category: 'timeline',
    difficulty: 'hard',
    title: 'Certificado médico fechado después de la salida',
    description: 'El certificado médico exigido para entrar (vacunas, prueba sanitaria) tiene una fecha de emisión posterior a la fecha en que el viajero salió de su país de origen según el billete.',
    documents_required: ['medical_certificate', 'flight_ticket'],
  },
  {
    id: 30,
    category: 'visual',
    difficulty: 'medium',
    title: 'Objeto sospechoso en equipaje escaneado',
    description: 'El escáner de equipaje muestra uno o más objetos que no han sido declarados en la declaración de aduanas: fajo de billetes, múltiples dispositivos electrónicos, o bulto de forma irregular.',
    documents_required: ['customs_declaration', 'luggage_scan'],
  },
];

export const getByDifficulty = (difficulty: Difficulty) =>
  INCONSISTENCY_CATALOG.filter((item) => item.difficulty === difficulty);

export const isConversationDrivenCase = (definition: InconsistencyDefinition): boolean =>
  CONVERSATION_DRIVEN_CATEGORIES.includes(definition.category);

export const isReliablyVerifiableCase = (definition: InconsistencyDefinition): boolean =>
  RELIABLY_VERIFIABLE_CATEGORIES.includes(definition.category);

export const getReliableCasesByDifficulty = (difficulty: Difficulty) =>
  getByDifficulty(difficulty).filter(isReliablyVerifiableCase);

export const getById = (id: number) =>
  INCONSISTENCY_CATALOG.find((item) => item.id === id);

export const getRandomCase = (difficulty: Difficulty): InconsistencyDefinition => {
  const pool = getByDifficulty(difficulty);
  return pool[Math.floor(Math.random() * pool.length)] as InconsistencyDefinition;
};

export const getRandomReliableCase = (difficulty: Difficulty): InconsistencyDefinition => {
  const pool = getReliableCasesByDifficulty(difficulty);
  return pool[Math.floor(Math.random() * pool.length)] as InconsistencyDefinition;
};
