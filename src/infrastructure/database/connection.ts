import { Kysely, MysqlDialect, MysqlQueryCompiler } from 'kysely';
import { createPool } from 'mysql2';
import type { Database } from './types';
import { logger } from '../../shared/utils';
import { runMigrations } from './migrator';

let db: Kysely<Database> | null = null;

export async function createDatabase(): Promise<Kysely<Database>> {
  if (db) return db;

  const pool = createPool({
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  db = new Kysely<Database>({
    dialect: new MysqlDialect({ pool }),
  });

  if (process.env.NOD_ENV !== 'production') {
    logger.info('Running database migration');
    await runMigrations(db);
  }

  logger.info('Database connected successfully');
  return db;
}

export function getDatabase(): Kysely<Database> {
  if (!db) {
    throw new Error('Database not initialized. Call createDatabase() first.');
  }
  return db;
}
