import 'dotenv/config';
import { createDatabase } from '../infrastructure/database/connection';
import { runMigrations } from '../infrastructure/database/migrator';

async function main() {
  const db = await createDatabase();
  await runMigrations(db);
  await db.destroy();
}

main().catch(console.error);
