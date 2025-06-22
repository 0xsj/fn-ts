// src/scripts/migrate.ts
import 'dotenv/config';
import { createDatabase } from '../infrastructure/database/connection';
import { runMigrations } from '../infrastructure/database/migrator';

async function main() {
  const db = await createDatabase();
  
  try {
    // Get direction from command line argument
    const direction = process.argv[2] as 'up' | 'down';
    
    if (direction === 'down') {
      console.log('🔄 Rolling back last migration...');
      await runMigrations(db, 'down');
    } else {
      console.log('🚀 Running migrations...');
      await runMigrations(db, 'up');
    }
    
    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();