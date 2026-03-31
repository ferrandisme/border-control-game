import 'server-only';

import { createClient, type Client } from '@libsql/client';

const COUNTER_KEY = 'global_processed_travelers';
export const FALLBACK_PROCESSED_TRAVELERS_ESTIMATE = 137;

let client: Client | null = null;

const getClient = (): Client | null => {
  if (client) {
    return client;
  }

  const url = process.env.TURSO_URL?.trim();
  const authToken = process.env.TURSO_API_TOKEN?.trim();

  if (!url || !authToken) {
    return null;
  }

  client = createClient({
    url,
    authToken,
  });

  return client;
};

const ensureCounterTable = async (db: Client): Promise<void> => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS game_counters (
      id TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    )
  `);

  await db.execute({
    sql: 'INSERT OR IGNORE INTO game_counters (id, value) VALUES (?, ?)',
    args: [COUNTER_KEY, FALLBACK_PROCESSED_TRAVELERS_ESTIMATE],
  });
};

export const getProcessedTravelersCount = async (): Promise<number> => {
  const db = getClient();
  if (!db) {
    return FALLBACK_PROCESSED_TRAVELERS_ESTIMATE;
  }

  try {
    await ensureCounterTable(db);
    const result = await db.execute({
      sql: 'SELECT value FROM game_counters WHERE id = ?',
      args: [COUNTER_KEY],
    });

    const value = result.rows[0]?.value;
    return typeof value === 'number' ? value : Number(value ?? FALLBACK_PROCESSED_TRAVELERS_ESTIMATE);
  } catch {
    return FALLBACK_PROCESSED_TRAVELERS_ESTIMATE;
  }
};

export const incrementProcessedTravelersCount = async (): Promise<number> => {
  const db = getClient();
  if (!db) {
    return FALLBACK_PROCESSED_TRAVELERS_ESTIMATE;
  }

  try {
    await ensureCounterTable(db);
    await db.batch([
      {
        sql: 'UPDATE game_counters SET value = value + 1 WHERE id = ?',
        args: [COUNTER_KEY],
      },
      {
        sql: 'SELECT value FROM game_counters WHERE id = ?',
        args: [COUNTER_KEY],
      },
    ], 'write');

    return getProcessedTravelersCount();
  } catch {
    return FALLBACK_PROCESSED_TRAVELERS_ESTIMATE;
  }
};
