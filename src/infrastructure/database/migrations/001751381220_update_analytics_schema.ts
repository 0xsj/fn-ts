// src/infrastructure/database/migrations/[timestamp]_update_audit_logs_schema.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add organization_id column
  await db.schema.alterTable('audit_logs').addColumn('organization_id', 'varchar(36)').execute();

  // Add severity column with enum
  await db.schema
    .alterTable('audit_logs')
    .addColumn('severity', sql`enum('low', 'medium', 'high', 'critical')`, (col) =>
      col.notNull().defaultTo('low'),
    )
    .execute();

  // Add metadata column
  await db.schema.alterTable('audit_logs').addColumn('metadata', 'json').execute();

  // Update the action enum to include new values
  // Note: MySQL doesn't support direct enum modifications, so we need to use raw SQL
  await sql`
    ALTER TABLE audit_logs MODIFY COLUMN action 
    ENUM(
      'create', 'read', 'update', 'delete',
      'login', 'logout', 'password_change', 'password_reset',
      'email_verify', 'two_factor_enable', 'two_factor_disable',
      'invite', 'accept_invite', 'remove_access', 'change_role',
      'approve', 'reject', 'publish', 'archive', 'restore',
      'activate', 'deactivate', 'suspend',
      'export', 'import', 'download', 'upload',
      'view', 'search', 'filter'
    ) NOT NULL
  `.execute(db);

  // Add indexes for new columns
  await db.schema
    .createIndex('idx_audit_logs_organization_id')
    .on('audit_logs')
    .column('organization_id')
    .execute();

  await db.schema
    .createIndex('idx_audit_logs_severity')
    .on('audit_logs')
    .column('severity')
    .execute();

  // Add composite index for org + user queries
  await db.schema
    .createIndex('idx_audit_logs_org_user')
    .on('audit_logs')
    .columns(['organization_id', 'user_id'])
    .execute();

  console.log('✅ Updated audit_logs table with new fields');
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop indexes first
  await db.schema.dropIndex('idx_audit_logs_org_user').on('audit_logs').execute();

  await db.schema.dropIndex('idx_audit_logs_severity').on('audit_logs').execute();

  await db.schema.dropIndex('idx_audit_logs_organization_id').on('audit_logs').execute();

  // Drop columns
  await db.schema.alterTable('audit_logs').dropColumn('metadata').execute();

  await db.schema.alterTable('audit_logs').dropColumn('severity').execute();

  await db.schema.alterTable('audit_logs').dropColumn('organization_id').execute();

  // Revert action enum to original values
  await sql`
    ALTER TABLE audit_logs MODIFY COLUMN action 
    ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import') NOT NULL
  `.execute(db);

  console.log('✅ Reverted audit_logs table changes');
}
