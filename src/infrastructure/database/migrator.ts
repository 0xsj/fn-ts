import { Kysely, Migrator, FileMigrationProvider } from 'kysely';
import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../../shared/utils';

export async function runMigrations(db: Kysely<any>): Promise<void> {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();
  results?.forEach((result) => {
    if (result.status === 'Success') {
      logger.info(`Migration "${result.migrationName}" was executed successfully`);
    } else if (result.status === 'Error') {
      logger.error(`Failed to execute migration "${result.migrationName}"`);
    }
  });

  if (error) {
    logger.error('Failed to run migrations', error);
    throw error;
  }
}
