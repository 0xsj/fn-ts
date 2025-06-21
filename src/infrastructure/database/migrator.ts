// src/infrastructure/database/migrator.ts
import { Kysely, Migrator, FileMigrationProvider, NO_MIGRATIONS } from 'kysely';
import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../../shared/utils/logger';

export async function runMigrations(db: Kysely<any>): Promise<void> {
  const migrationFolder = path.join(__dirname, 'migrations');

  // Check if migrations folder exists
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

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((result) => {
    if (result.status === 'Success') {
      logger.info(`Migration "${result.migrationName}" executed successfully`);
    } else if (result.status === 'Error') {
      logger.error(`Failed to execute migration "${result.migrationName}"`);
    }
  });

  if (error) {
    logger.error('Migration error:', error);
    throw error;
  }

  if (!results?.length) {
    logger.info('No migrations to run');
  }
}
