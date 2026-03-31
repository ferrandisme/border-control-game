import type { Difficulty } from '@/schemas/traveler';

import type { InconsistencyDefinition } from '@/lib/inconsistency-catalog';
import { getReliableCasesByDifficulty } from '@/lib/inconsistency-catalog';

const DEFAULT_GUILT_PROBABILITY = 0.7;

export const shouldBeGuilty = (): boolean => {
  return Math.random() < DEFAULT_GUILT_PROBABILITY;
};

export const getDifficulty = (day: number): Difficulty => {
  if (day <= 2) {
    return 'easy';
  }

  if (day <= 5) {
    return 'medium';
  }

  return 'hard';
};

export const selectInconsistency = (day: number, excludedIds: number[] = []): InconsistencyDefinition | null => {
  if (!shouldBeGuilty()) {
    return null;
  }

  const difficulty = getDifficulty(day);
  const pool = getReliableCasesByDifficulty(difficulty).filter((item) => !excludedIds.includes(item.id));

  if (pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)] as InconsistencyDefinition;
  }

  return null;
};
