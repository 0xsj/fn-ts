// src/infrastructure/database/migrations/001751999999_add_updated_at_to_email_verification_tokens.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add updated_at column to email_verification_tokens table
  await db.schema
    .alterTable('email_verification_tokens')
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  console.log('✅ Added updated_at column to email_verification_tokens table');
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove updated_at column
  await db.schema.alterTable('email_verification_tokens').dropColumn('updated_at').execute();

  console.log('✅ Removed updated_at column from email_verification_tokens table');
}
