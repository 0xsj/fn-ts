// src/infrastructure/database/migrator.ts
import { Kysely, Migrator, FileMigrationProvider, MigrationResult } from 'kysely';
import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../../shared/utils/logger';

export async function runMigrations(
  db: Kysely<any>,
  direction: 'up' | 'down' = 'up',
): Promise<void> {
  const migrationFolder = path.join(__dirname, 'migrations');

  try {
    await fs.access(migrationFolder);
    logger.info(`Migration folder found at: ${migrationFolder}`);
  } catch {
    logger.info('Creating migrations folder...');
    await fs.mkdir(migrationFolder, { recursive: true });
  }

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    }),
  });

  try {
    if (direction === 'up') {
      const { error, results } = await migrator.migrateToLatest();
      handleMigrationResults(results, error);
    } else {
      const { error, results } = await migrator.migrateDown();
      handleMigrationResults(results, error);
    }
  } catch (error) {
    logger.error('Migration execution error:', error);
    throw error;
  }
}

function handleMigrationResults(
  results: readonly MigrationResult[] | undefined,
  error: unknown,
): void {
  results?.forEach((result) => {
    if (result.status === 'Success') {
      logger.info(`Migration "${result.migrationName}" executed successfully`);
    } else if (result.status === 'Error') {
      logger.error(`Failed to execute migration "${result.migrationName}"`);
    } else if (result.status === 'NotExecuted') {
      logger.info(`Migration "${result.migrationName}" skipped`);
    }
  });

  if (error) {
    logger.error('Migration error:', error);
    if (error instanceof Error) {
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);
    }
    throw error;
  }

  if (!results?.length) {
    logger.info('No migrations to run');
  }
}
