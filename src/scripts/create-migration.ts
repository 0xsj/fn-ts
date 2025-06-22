// src/scripts/create-migration.ts
import { promises as fs } from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '../infrastructure/database/migrations');

async function createMigration(name: string): Promise<void> {
  // Validate name
  if (!name) {
    console.error('❌ Migration name is required');
    console.log('Usage: npm run migration:create <name>');
    console.log('Example: npm run migration:create add_status_to_incidents');
    process.exit(1);
  }

  // Sanitize name (replace spaces with underscores, remove special chars)
  const sanitizedName = name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  // Generate timestamp and filename
  const timestamp = Date.now();
  const paddedNumber = String(Math.floor(timestamp / 1000)).padStart(12, '0');
  const filename = `${paddedNumber}_${sanitizedName}.ts`;
  const filepath = path.join(MIGRATIONS_DIR, filename);

  // Migration template
  const template = `import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // TODO: Implement migration
  // Examples:
  
  // Create table
  // await db.schema
  //   .createTable('table_name')
  //   .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
  //   .addColumn('created_at', 'timestamp', (col) => 
  //     col.notNull().defaultTo(sql\`CURRENT_TIMESTAMP\`)
  //   )
  //   .execute();
  
  // Add column
  // await db.schema
  //   .alterTable('table_name')
  //   .addColumn('column_name', 'varchar(255)')
  //   .execute();
  
  // Create index
  // await db.schema
  //   .createIndex('idx_table_column')
  //   .on('table_name')
  //   .column('column_name')
  //   .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // TODO: Implement rollback
  // Examples:
  
  // Drop table
  // await db.schema.dropTable('table_name').execute();
  
  // Drop column
  // await db.schema
  //   .alterTable('table_name')
  //   .dropColumn('column_name')
  //   .execute();
  
  // Drop index
  // await db.schema.dropIndex('idx_table_column').execute();
}
`;

  try {
    // Ensure migrations directory exists
    await fs.mkdir(MIGRATIONS_DIR, { recursive: true });

    // Check if file already exists
    try {
      await fs.access(filepath);
      console.error(`❌ Migration file already exists: ${filename}`);
      process.exit(1);
    } catch {
      // File doesn't exist, we can create it
    }

    // Write migration file
    await fs.writeFile(filepath, template, 'utf8');
    
    console.log(`✅ Created migration: ${filename}`);
    console.log(`📁 Location: ${filepath}`);
    console.log('\nNext steps:');
    console.log('1. Edit the migration file to add your schema changes');
    console.log('2. Run "npm run migrate" to apply the migration');
    console.log('3. Run "npm run migrate:down" to rollback if needed');
  } catch (error) {
    console.error('❌ Failed to create migration:', error);
    process.exit(1);
  }
}

// Get migration name from command line arguments
const migrationName = process.argv.slice(2).join(' ');
createMigration(migrationName);