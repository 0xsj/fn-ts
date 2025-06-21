// src/infrastructure/database/connection.ts
import { Kysely, MysqlDialect } from 'kysely';
import { createPool } from 'mysql2';
import type { Database } from './types';
import { logger } from '../../shared/utils/logger';
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

  // Test connection
  try {
    const connection = await pool.promise().getConnection();
    await connection.ping();
    connection.release();
    logger.info('Database connection successful');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }

  db = new Kysely<Database>({
    dialect: new MysqlDialect({ pool }),
  });

  // Run migrations in development
  if (process.env.NODE_ENV !== 'production') {
    try {
      logger.info('Running database migrations...');
      await runMigrations(db);
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  logger.info('Database initialized successfully');
  return db;
}