// src/scripts/migrate-to.ts
import 'dotenv/config';
import { Kysely, Migrator, FileMigrationProvider } from 'kysely';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createDatabase } from '../infrastructure/database/connection';

async function migrateTo(targetMigration: string) {
  let db: Kysely<any> | null = null;

  try {
    // Get target migration name from command line
    const target = targetMigration || process.argv[2];

    if (!target) {
      console.error('❌ Please specify a migration name');
      console.log('Usage: npm run migrate:to <migration_name>');
      console.log('Example: npm run migrate:to 001750999209_create_users_and_auth_tables');
      process.exit(1);
    }

    db = await createDatabase();

    const migrator = new Migrator({
      db,
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: path.join(__dirname, '../infrastructure/database/migrations'),
      }),
    });

    console.log(`🎯 Migrating to: ${target}`);

    const { error, results } = await migrator.migrateTo(target);

    results?.forEach((it) => {
      if (it.status === 'Success') {
        console.log(`✅ Migration "${it.migrationName}" was executed successfully`);
      } else if (it.status === 'Error') {
        console.error(`❌ Failed to execute migration "${it.migrationName}"`);
      }
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await db?.destroy();
  }
}

// Run if called directly
if (require.main === module) {
  migrateTo(process.argv[2]);
}
