// src/infrastructure/database/migrations/XXXXXXXXXXXX_add_updated_at_to_password_reset_tokens.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add updated_at column to password_reset_tokens table
  await db.schema
    .alterTable('password_reset_tokens')
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add ip_address and user_agent columns if they don't exist
  // (The schema expects these but they might be missing from the original migration)
  try {
    await db.schema
      .alterTable('password_reset_tokens')
      .addColumn('ip_address', 'varchar(45)')
      .execute();
  } catch (error) {
    // Column might already exist
  }

  try {
    await db.schema.alterTable('password_reset_tokens').addColumn('user_agent', 'text').execute();
  } catch (error) {
    // Column might already exist
  }

  console.log('✅ Added updated_at column to password_reset_tokens table');
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove updated_at column
  await db.schema.alterTable('password_reset_tokens').dropColumn('updated_at').execute();

  console.log('✅ Removed updated_at column from password_reset_tokens table');
}
