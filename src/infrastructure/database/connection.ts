// // src/infrastructure/database/connection.ts
// import { Kysely, MysqlDialect } from 'kysely';
// import { createPool } from 'mysql2';
// import type { Database } from './types';
// import { logger } from '../../shared/utils/logger';
// import { runMigrations } from './migrator';

// let db: Kysely<Database> | null = null;

// export async function createDatabase(): Promise<Kysely<Database>> {
//   if (db) return db;

//   const pool = createPool({
//     host: process.env.DB_HOST!,
//     port: parseInt(process.env.DB_PORT!),
//     user: process.env.DB_USER!,
//     password: process.env.DB_PASSWORD!,
//     database: process.env.DB_NAME!,
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0,
//   });

//   // Test connection
//   try {
//     const connection = await pool.promise().getConnection();
//     await connection.ping();
//     connection.release();
//     logger.info('Database connection successful');
//   } catch (error) {
//     logger.error('Database connection failed:', error);
//     throw error;
//   }

//   db = new Kysely<Database>({
//     dialect: new MysqlDialect({ pool }),
//   });

//   // Run migrations in development
//   if (process.env.NODE_ENV !== 'production') {
//     try {
//       logger.info('Running database migrations...');
//       await runMigrations(db);
//     } catch (error) {
//       logger.error('Migration failed:', error);
//       throw error;
//     }
//   }

//   logger.info('Database initialized successfully');
//   return db;
// }


// src/infrastructure/database/connection.ts
import { Kysely, MysqlDialect } from 'kysely';
import { createPool } from 'mysql2';
import type { Database } from './types';
import { logger } from '../../shared/utils/logger';
import { runMigrations } from './migrator';
import { config } from '../../core/config';

let db: Kysely<Database> | null = null;

export async function createDatabase(): Promise<Kysely<Database>> {
  if (db) return db;

  const pool = createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.username,
    password: config.database.password,
    database: config.database.database,
    waitForConnections: true,
    connectionLimit: config.database.pool.max,
    queueLimit: 0,
  });

  // Test connection with better error logging
  try {
    const connection = await pool.promise().getConnection();
    await connection.ping();
    connection.release();
    logger.info('Database connection successful');
  } catch (error) {
    logger.error('Database connection failed:', {
      error: error instanceof Error ? error.message : error,
      config: {
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        user: config.database.username,
        // Don't log password
      }
    });
    throw error;
  }

  db = new Kysely<Database>({
    dialect: new MysqlDialect({ pool }),
  });

  // Run migrations in development
  if (config.app.env !== 'production') {
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