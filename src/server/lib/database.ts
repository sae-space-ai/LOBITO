// ============================================================
// SERVICIO POSTGRESQL - Backend Serverless
// Usa DATABASE_URL (variable privada del servidor)
// ============================================================

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool | null {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  pool = new Pool({
    connectionString: databaseUrl,
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL] Error inesperado en pool:', err);
  });

  return pool;
}

export function isDatabaseAvailable(): boolean {
  return getPool() !== null;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  if (!pool) {
    throw new Error('DATABASE_URL no configurada. PostgreSQL no disponible.');
  }
  return pool.query<T>(text, params as any[]);
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  if (!pool) {
    throw new Error('DATABASE_URL no configurada');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function healthCheck(): Promise<{
  connected: boolean;
  latency: number;
  version: string | null;
}> {
  const pool = getPool();
  if (!pool) {
    return { connected: false, latency: 0, version: null };
  }
  const start = Date.now();
  try {
    const result = await pool.query('SELECT version() as version');
    return {
      connected: true,
      latency: Date.now() - start,
      version: result.rows[0]?.version || null,
    };
  } catch (error) {
    return {
      connected: false,
      latency: Date.now() - start,
      version: null,
    };
  }
}
