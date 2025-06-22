// src/scripts/migrate-status.ts
import 'dotenv/config';
import { Kysely } from 'kysely';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createDatabase } from '../infrastructure/database/connection';

async function getMigrationStatus(): Promise<void> {
  let db: Kysely<any> | null = null;
  
  try {
    db = await createDatabase();
    
    // Get executed migrations from database
    const executedMigrations = await db
      .selectFrom('kysely_migration')
      .selectAll()
      .orderBy('timestamp', 'asc')
      .execute();
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, '../infrastructure/database/migrations');
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
      .sort();
    
    console.log('\n📊 Migration Status\n');
    console.log('Status | Migration File');
    console.log('-------|---------------');
    
    const executedSet = new Set(executedMigrations.map(m => m.name));
    
    for (const file of migrationFiles) {
      const migrationName = file.replace(/\.(ts|js)$/, '');
      const isExecuted = executedSet.has(migrationName);
      const status = isExecuted ? '✅' : '⏳';
      console.log(`${status}     | ${file}`);
    }
    
    console.log('\nSummary:');
    console.log(`Total migrations: ${migrationFiles.length}`);
    console.log(`Executed: ${executedMigrations.length}`);
    console.log(`Pending: ${migrationFiles.length - executedMigrations.length}`);
    
  } catch (error) {
    console.error('❌ Failed to get migration status:', error);
    process.exit(1);
  } finally {
    if (db) {
      await db.destroy();
    }
  }
}

getMigrationStatus();