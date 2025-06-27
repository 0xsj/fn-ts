// src/scripts/test-org-migration.ts
import 'dotenv/config';
import { Kysely, MysqlDialect, sql } from 'kysely';
import { createPool } from 'mysql2';
import { config } from '../core/config';

// Define types for our queries
interface VersionResult {
  version: string;
}

interface TableResult {
  Tables_in_database?: string;
  [key: string]: string | undefined;
}

interface ColumnResult {
  Field: string;
  Type: string;
  Null: string;
  Key: string;
  Default: string | null;
  Extra: string;
}

async function testOrgMigration() {
  const pool = createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.username,
    password: config.database.password,
    database: config.database.database,
  });

  const db = new Kysely<any>({
    dialect: new MysqlDialect({ pool }),
  });

  try {
    console.log('Testing organizations table creation...\n');

    // First, ensure the table doesn't exist
    await db.schema.dropTable('organizations').ifExists().execute();
    console.log('✅ Cleaned up any existing table');

    // Try with minimal columns first
    console.log('\n1. Creating table with basic columns...');
    await db.schema
      .createTable('organizations')
      .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
      .addColumn('name', 'varchar(255)', (col) => col.notNull())
      .addColumn('created_at', 'timestamp', (col) =>
        col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();
    console.log('✅ Basic table created');

    // Add enum column
    console.log('\n2. Adding enum column...');
    await db.schema
      .alterTable('organizations')
      .addColumn('type', sql`enum('free', 'pro', 'enterprise')`, (col) => col.defaultTo('free'))
      .execute();
    console.log('✅ Enum column added');

    // Add JSON column with empty object default
    console.log('\n3. Adding JSON column with empty default...');
    await db.schema
      .alterTable('organizations')
      .addColumn('settings', 'json', (col) => col.defaultTo('{}'))
      .execute();
    console.log('✅ JSON column added');

    // Try adding JSON with complex default
    console.log('\n4. Adding JSON column with complex default...');
    const complexDefault = JSON.stringify({
      timezone: 'UTC',
      locale: 'en',
    });
    await db.schema
      .alterTable('organizations')
      .addColumn('billing', 'json', (col) => col.defaultTo(complexDefault))
      .execute();
    console.log('✅ Complex JSON column added');

    // Verify the table
    const columns = await sql<ColumnResult>`DESCRIBE organizations`.execute(db);
    console.log('\n📊 Final table structure:');
    console.table(columns.rows);
  } catch (error: any) {
    console.error('\n❌ Error occurred:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('SQL State:', error.sqlState);
    console.error('SQL:', error.sql);

    // Check MySQL version
    try {
      const version = await sql<VersionResult>`SELECT VERSION() as version`.execute(db);
      console.error('\nMySQL Version:', version.rows[0].version);
    } catch (versionError) {
      console.error('Could not get MySQL version');
    }
  } finally {
    // Clean up
    await db.schema.dropTable('organizations').ifExists().execute();
    await db.destroy();
  }
}

testOrgMigration();
