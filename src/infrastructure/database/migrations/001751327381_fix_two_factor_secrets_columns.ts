import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ============================================
  // 1. Fix two_factor_secrets table to match schema
  // ============================================
  await db.schema
    .alterTable('two_factor_secrets')
    .addColumn('enabled', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('enabled_at', 'timestamp')
    .addColumn('last_used_at', 'timestamp')
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // ============================================
  // 2. Fix api_keys table to match ApiKeyDBSchema
  // ============================================
  // Rename key_hint to key_prefix to match schema
  await db.schema.alterTable('api_keys').renameColumn('key_hint', 'key_prefix').execute();

  // Add missing fields from ApiKeyDBSchema
  await db.schema
    .alterTable('api_keys')
    .addColumn('rate_limit_per_hour', 'integer')
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('organization_id', 'varchar(36)')
    .execute();

  // Add foreign key for organization
  await db.schema
    .alterTable('api_keys')
    .addForeignKeyConstraint('fk_api_keys_organization', ['organization_id'], 'organizations', [
      'id',
    ])
    .onDelete('cascade')
    .execute();

  // ============================================
  // 3. Fix sessions table to match SessionDBSchema
  // ============================================
  // The schema has these additional fields that could be useful
  await db.schema
    .alterTable('sessions')
    .addColumn('permissions_snapshot', 'json') // For caching permissions at login
    .execute();

  // ============================================
  // 4. Fix user_auth_providers to match AuthProviderDBSchema
  // ============================================
  // The schema expects these fields to be nullable, not the actual tokens
  await db.schema
    .alterTable('user_auth_providers')
    .modifyColumn('provider_data', 'json', (col) => col.defaultTo(null))
    .execute();

  // Add is_primary field from schema
  await db.schema
    .alterTable('user_auth_providers')
    .addColumn('is_primary', 'boolean', (col) => col.notNull().defaultTo(false))
    .execute();

  // The schema has access_token, refresh_token, token_expires_at as nullable fields
  // These are already in the migration, so we just need to ensure they're nullable
  await db.schema
    .alterTable('user_auth_providers')
    .addColumn('access_token', 'text')
    .addColumn('refresh_token', 'text')
    .addColumn('token_expires_at', 'timestamp')
    .execute();

  // ============================================
  // 5. Create indexes for better performance
  // ============================================
  await db.schema
    .createIndex('idx_api_keys_organization_id')
    .on('api_keys')
    .column('organization_id')
    .execute();

  await db.schema
    .createIndex('idx_api_keys_is_active')
    .on('api_keys')
    .column('is_active')
    .execute();

  await db.schema
    .createIndex('idx_two_factor_secrets_enabled')
    .on('two_factor_secrets')
    .column('enabled')
    .execute();

  await db.schema
    .createIndex('idx_user_auth_providers_is_primary')
    .on('user_auth_providers')
    .column('is_primary')
    .execute();

  console.log('✅ Updated auth tables to match schema definitions');
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop indexes
  await db.schema.dropIndex('idx_user_auth_providers_is_primary').execute();
  await db.schema.dropIndex('idx_two_factor_secrets_enabled').execute();
  await db.schema.dropIndex('idx_api_keys_is_active').execute();
  await db.schema.dropIndex('idx_api_keys_organization_id').execute();

  // Revert user_auth_providers changes
  await db.schema.alterTable('user_auth_providers').dropColumn('token_expires_at').execute();
  await db.schema.alterTable('user_auth_providers').dropColumn('refresh_token').execute();
  await db.schema.alterTable('user_auth_providers').dropColumn('access_token').execute();
  await db.schema.alterTable('user_auth_providers').dropColumn('is_primary').execute();

  // Revert sessions changes
  await db.schema.alterTable('sessions').dropColumn('permissions_snapshot').execute();

  // Revert api_keys changes
  await db.schema
    .alterTable('api_keys')
    .dropConstraint('fk_api_keys_organization')
    .ifExists()
    .execute();
  await db.schema.alterTable('api_keys').dropColumn('organization_id').execute();
  await db.schema.alterTable('api_keys').dropColumn('is_active').execute();
  await db.schema.alterTable('api_keys').dropColumn('rate_limit_per_hour').execute();
  await db.schema.alterTable('api_keys').renameColumn('key_prefix', 'key_hint').execute();

  // Revert two_factor_secrets changes
  await db.schema.alterTable('two_factor_secrets').dropColumn('updated_at').execute();
  await db.schema.alterTable('two_factor_secrets').dropColumn('last_used_at').execute();
  await db.schema.alterTable('two_factor_secrets').dropColumn('enabled_at').execute();
  await db.schema.alterTable('two_factor_secrets').dropColumn('enabled').execute();

  console.log('✅ Reverted auth table updates');
}
