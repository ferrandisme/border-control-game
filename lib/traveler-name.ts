const NAME_POOLS = {
  default: {
    first: ['Alex', 'Samira', 'Daniel', 'Elena', 'Nadia', 'Mateo', 'Lina', 'Iván', 'Clara', 'Omar'],
    last: ['Morales', 'Navarro', 'Rossi', 'Khan', 'Petrov', 'Silva', 'Costa', 'Méndez', 'Ibrahim', 'Nowak'],
  },
  hispanic: {
    first: ['Lucía', 'Mateo', 'Valentina', 'Javier', 'Camila', 'Sergio', 'Elena', 'Andrés', 'Paula', 'Diego'],
    last: ['García', 'Rojas', 'Navarro', 'Torres', 'Mendoza', 'Castro', 'Vega', 'Morales', 'Herrera', 'Paredes'],
  },
  anglophone: {
    first: ['Emma', 'Oliver', 'Amelia', 'Noah', 'Chloe', 'Liam', 'Sophie', 'Ethan', 'Grace', 'Mason'],
    last: ['Walker', 'Parker', 'Bennett', 'Turner', 'Hughes', 'Coleman', 'Brooks', 'Foster', 'Hayes', 'Reed'],
  },
  eastAsian: {
    first: ['Yuna', 'Hana', 'Minho', 'Haruto', 'Mei', 'Sora', 'Jisoo', 'Ren', 'Aiko', 'Daichi'],
    last: ['Kim', 'Sato', 'Tanaka', 'Park', 'Lin', 'Chen', 'Kobayashi', 'Ito', 'Zhang', 'Yamamoto'],
  },
  arabic: {
    first: ['Layla', 'Omar', 'Noura', 'Youssef', 'Salma', 'Karim', 'Mariam', 'Hassan', 'Amina', 'Tariq'],
    last: ['Haddad', 'Rahman', 'Mansour', 'Khalil', 'Farah', 'Najjar', 'Hamdan', 'Saad', 'Sharif', 'Nasser'],
  },
  easternEuropean: {
    first: ['Anya', 'Marek', 'Katya', 'Tomasz', 'Elina', 'Nikolai', 'Petra', 'Luka', 'Ivana', 'Dimitri'],
    last: ['Novak', 'Petrov', 'Kowalski', 'Ivanov', 'Horvat', 'Markovic', 'Popov', 'Bartosz', 'Stoica', 'Dobrev'],
  },
} as const;

const FORBIDDEN_NAME_PATTERNS = [
  /viajero\s+an[oó]nimo/i,
  /anonymous/i,
  /^n\/a$/i,
  /^unknown$/i,
] as const;

const selectPool = (nationality: string | null | undefined) => {
  const lowered = nationality?.toLowerCase().trim() ?? '';

  if (/(españa|spain|méxico|mexico|argentina|chile|perú|peru|colombia|uruguay|ecuador|bolivia|paraguay|venezuela|costa rica|guatemala)/i.test(lowered)) {
    return NAME_POOLS.hispanic;
  }

  if (/(united states|usa|canada|australia|new zealand|ireland|uk|united kingdom|england|scotland)/i.test(lowered)) {
    return NAME_POOLS.anglophone;
  }

  if (/(japan|jap[oó]n|china|korea|corea|taiwan|vietnam|singapore)/i.test(lowered)) {
    return NAME_POOLS.eastAsian;
  }

  if (/(morocco|marruecos|egypt|egipto|jordan|lebanon|l[íi]bano|saudi|emirates|uae|tunisia|tunisia|algeria|argelia)/i.test(lowered)) {
    return NAME_POOLS.arabic;
  }

  if (/(poland|polonia|romania|ruman[ií]a|bulgaria|croatia|croacia|serbia|ukraine|ucrania|russia|rusia)/i.test(lowered)) {
    return NAME_POOLS.easternEuropean;
  }

  return NAME_POOLS.default;
};

const pickRandom = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)] as T;
};

export const isPlaceholderTravelerName = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    return true;
  }

  const trimmed = value.trim();
  if (trimmed.length < 3) {
    return true;
  }

  return FORBIDDEN_NAME_PATTERNS.some((pattern) => pattern.test(trimmed));
};

export const generateTravelerName = (nationality?: string | null): string => {
  const pool = selectPool(nationality);
  return `${pickRandom(pool.first)} ${pickRandom(pool.last)}`;
};

export const resolveTravelerName = (...candidates: Array<string | null | undefined>): string | null => {
  for (const candidate of candidates) {
    if (!isPlaceholderTravelerName(candidate)) {
      return candidate!.trim();
    }
  }

  return null;
};
