// src/scripts/drop-all-tables.ts
import 'dotenv/config';
import { Kysely, MysqlDialect, sql } from 'kysely';
import { createPool } from 'mysql2';
import { config } from '../core/config';

async function dropAllTables() {
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
    console.log('🗑️  Dropping all tables...\n');

    // Disable foreign key checks
    await sql`SET FOREIGN_KEY_CHECKS = 0`.execute(db);

    // Drop Communication tables
    console.log('Dropping communication tables...');
    await db.schema.dropTable('presence').ifExists().execute();
    await db.schema.dropTable('message_read_receipts').ifExists().execute();
    await db.schema.dropTable('messages').ifExists().execute();
    await db.schema.dropTable('thread_participants').ifExists().execute();
    await db.schema.dropTable('threads').ifExists().execute();
    console.log('✅ Communication tables dropped');

    // Drop Access Control tables
    console.log('\nDropping access control tables...');
    await db.schema.dropTable('organization_members').ifExists().execute();
    await db.schema.dropTable('user_roles').ifExists().execute();
    await db.schema.dropTable('role_permissions').ifExists().execute();
    await db.schema.dropTable('roles').ifExists().execute();
    await db.schema.dropTable('permissions').ifExists().execute();
    console.log('✅ Access control tables dropped');

    // Drop Auth tables
    console.log('\nDropping auth tables...');
    await db.schema.dropTable('two_factor_secrets').ifExists().execute();
    await db.schema.dropTable('api_keys').ifExists().execute();
    await db.schema.dropTable('password_reset_tokens').ifExists().execute();
    await db.schema.dropTable('email_verification_tokens').ifExists().execute();
    await db.schema.dropTable('sessions').ifExists().execute();
    await db.schema.dropTable('auth_providers').ifExists().execute();
    await db.schema.dropTable('user_security').ifExists().execute();
    await db.schema.dropTable('user_auth_providers').ifExists().execute();
    await db.schema.dropTable('user_passwords').ifExists().execute();
    console.log('✅ Auth tables dropped');

    // Drop Users table
    console.log('\nDropping users table...');
    await db.schema.dropTable('users').ifExists().execute();
    console.log('✅ Users table dropped');

    // Drop Organizations table
    console.log('\nDropping organizations table...');
    await db.schema.dropTable('organizations').ifExists().execute();
    console.log('✅ Organizations table dropped');

    // Re-enable foreign key checks
    await sql`SET FOREIGN_KEY_CHECKS = 1`.execute(db);

    // Clear migration history for these tables
    console.log('\nClearing migration history...');
    await db
      .deleteFrom('kysely_migration')
      .where('name', 'in', [
        '001750999205_create_organizations_table',
        '001750999209_create_users_and_auth_tables',
        '001750999212_create_access_control_tables',
        '001750999215_create_communication_tables',
      ])
      .execute();

    console.log('✅ Migration history cleared');

    console.log('\n✅ All tables dropped successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.destroy();
  }
}

dropAllTables();
