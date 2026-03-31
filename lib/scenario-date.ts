const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toMidday = (date: Date): Date => {
  const clone = new Date(date);
  clone.setHours(12, 0, 0, 0);
  return clone;
};

const addDays = (date: Date, days: number): Date => new Date(toMidday(date).getTime() + days * DAY_IN_MS);

export const formatIsoDate = (date: Date): string => {
  const normalized = toMidday(date);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, '0');
  const day = String(normalized.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export type ScenarioDates = {
  today: string;
  inspectionDate: string;
  arrivalDate: string;
  departureDate: string;
  visaValidFrom: string;
  visaValidUntil: string;
  documentIssueDate: string;
  passportExpiryDate: string;
  certificateDate: string;
  contractStartDate: string;
  stayLengthDays: number;
};

export const getScenarioDates = (day: number): ScenarioDates => {
  const baseToday = toMidday(new Date());
  const inspectionDate = addDays(baseToday, Math.max(0, day - 1));
  const stayLengthDays = 5 + ((day - 1) % 5);

  return {
    today: formatIsoDate(inspectionDate),
    inspectionDate: formatIsoDate(inspectionDate),
    arrivalDate: formatIsoDate(inspectionDate),
    departureDate: formatIsoDate(addDays(inspectionDate, stayLengthDays)),
    visaValidFrom: formatIsoDate(addDays(inspectionDate, -45)),
    visaValidUntil: formatIsoDate(addDays(inspectionDate, 120)),
    documentIssueDate: formatIsoDate(addDays(inspectionDate, -365)),
    passportExpiryDate: formatIsoDate(addDays(inspectionDate, 5 * 365)),
    certificateDate: formatIsoDate(addDays(inspectionDate, -7)),
    contractStartDate: formatIsoDate(addDays(inspectionDate, 3)),
    stayLengthDays,
  };
};
