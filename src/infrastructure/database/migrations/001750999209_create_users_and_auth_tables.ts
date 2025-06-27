// migrations/001750999209_create_users_and_auth_tables.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ============================================
  // 1. USERS TABLE
  // ============================================
  await db.schema
    .createTable('users')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())

    // Basic info
    .addColumn('first_name', 'varchar(100)', (col) => col.notNull())
    .addColumn('last_name', 'varchar(100)', (col) => col.notNull())
    .addColumn('display_name', 'varchar(255)')
    .addColumn('username', 'varchar(50)')

    // Contact
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('email_verified', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('email_verified_at', 'timestamp')

    .addColumn('phone', 'varchar(50)')
    .addColumn('phone_verified', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('phone_verified_at', 'timestamp')

    // Status
    .addColumn(
      'status',
      sql`enum('active', 'inactive', 'suspended', 'pending_verification')`,
      (col) => col.notNull().defaultTo('pending_verification'),
    )
    .addColumn('type', sql`enum('internal', 'external', 'system', 'bot')`, (col) =>
      col.notNull().defaultTo('internal'),
    )

    // Organization
    .addColumn('organization_id', 'varchar(36)')

    // Profile
    .addColumn('avatar_url', 'varchar(500)')
    .addColumn('title', 'varchar(100)')
    .addColumn('department', 'varchar(100)')
    .addColumn('employee_id', 'varchar(50)')

    // Location
    .addColumn('timezone', 'varchar(50)', (col) => col.notNull().defaultTo('UTC'))
    .addColumn('locale', 'varchar(10)', (col) => col.notNull().defaultTo('en'))
    .addColumn('location_id', 'varchar(36)')

    // JSON columns
    .addColumn('emergency_contact', 'json')
    .addColumn('preferences', 'json', (col) => col.notNull())
    .addColumn('cached_permissions', 'json', (col) => col.notNull())
    .addColumn('permissions_updated_at', 'timestamp')

    // Activity tracking
    .addColumn('last_activity_at', 'timestamp')
    .addColumn('total_login_count', 'integer', (col) => col.notNull().defaultTo(0))

    // Metadata
    .addColumn('custom_fields', 'json', (col) => col.notNull())
    .addColumn('tags', 'json', (col) => col.notNull())

    // Soft delete
    .addColumn('deleted_at', 'timestamp')
    .addColumn('deleted_by', 'varchar(36)')
    .addColumn('deactivated_reason', 'text')

    // Timestamps
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign key constraint to organizations
  await db.schema
    .alterTable('users')
    .addForeignKeyConstraint('fk_users_organization', ['organization_id'], 'organizations', ['id'])
    .onDelete('set null')
    .execute();

  // ============================================
  // 2. USER_PASSWORDS TABLE
  // ============================================
  await db.schema
    .createTable('user_passwords')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('user_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('password_hash', 'varchar(255)', (col) => col.notNull())
    .addColumn('expires_at', 'timestamp')
    .addColumn('must_change', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Add foreign key after table is created
  await db.schema
    .alterTable('user_passwords')
    .addForeignKeyConstraint('fk_user_passwords_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  // ============================================
  // 3. USER_AUTH_PROVIDERS TABLE
  // ============================================
  await db.schema
    .createTable('user_auth_providers')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('user_id', 'varchar(36)', (col) => col.notNull())
    .addColumn(
      'provider',
      sql`enum('google', 'github', 'microsoft', 'apple', 'facebook', 'saml', 'oidc')`,
      (col) => col.notNull(),
    )
    .addColumn('provider_user_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('provider_data', 'json')
    .addColumn('linked_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('last_used_at', 'timestamp')
    .execute();

  await db.schema
    .alterTable('user_auth_providers')
    .addForeignKeyConstraint('fk_user_auth_providers_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  // ============================================
  // 4. USER_SECURITY TABLE
  // ============================================
  await db.schema
    .createTable('user_security')
    .addColumn('user_id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('failed_login_attempts', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('locked_until', 'timestamp')
    .addColumn('last_login_at', 'timestamp')
    .addColumn('last_login_ip', 'varchar(45)')
    .addColumn('two_factor_enabled', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('two_factor_secret_id', 'varchar(36)')
    .addColumn('last_password_change_at', 'timestamp')
    .addColumn('password_history', 'json', (col) => col.notNull())
    .addColumn('security_questions', 'json', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .alterTable('user_security')
    .addForeignKeyConstraint('fk_user_security_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  // ============================================
  // 5. AUTH_PROVIDERS TABLE
  // ============================================
  await db.schema
    .createTable('auth_providers')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('name', 'varchar(100)', (col) => col.notNull())
    .addColumn('type', sql`enum('oauth2', 'saml', 'oidc', 'ldap')`, (col) => col.notNull())
    .addColumn(
      'provider',
      sql`enum('google', 'github', 'microsoft', 'apple', 'facebook', 'custom')`,
      (col) => col.notNull(),
    )
    .addColumn('client_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('client_secret', 'text', (col) => col.notNull())
    .addColumn('issuer', 'varchar(500)')
    .addColumn('authorization_url', 'varchar(500)')
    .addColumn('token_url', 'varchar(500)')
    .addColumn('userinfo_url', 'varchar(500)')
    .addColumn('jwks_uri', 'varchar(500)')
    .addColumn('scopes', 'json', (col) => col.notNull())
    .addColumn('auto_discover', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('is_enabled', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('allow_signup', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('allow_login', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('attribute_mapping', 'json', (col) => col.notNull())
    .addColumn('organization_id', 'varchar(36)')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .alterTable('auth_providers')
    .addForeignKeyConstraint(
      'fk_auth_providers_organization',
      ['organization_id'],
      'organizations',
      ['id'],
    )
    .onDelete('cascade')
    .execute();

  // ============================================
  // 6. SESSIONS TABLE
  // ============================================
  await db.schema
    .createTable('sessions')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('user_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('token_hash', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('refresh_token_hash', 'varchar(255)')
    .addColumn('device_id', 'varchar(255)')
    .addColumn('device_name', 'varchar(255)')
    .addColumn('device_type', sql`enum('web', 'mobile', 'desktop', 'api')`, (col) =>
      col.notNull().defaultTo('web'),
    )
    .addColumn('user_agent', 'text')
    .addColumn('ip_address', 'varchar(45)')
    .addColumn('expires_at', 'timestamp', (col) => col.notNull())
    .addColumn('refresh_expires_at', 'timestamp')
    .addColumn('idle_timeout_at', 'timestamp')
    .addColumn('absolute_timeout_at', 'timestamp')
    .addColumn('last_activity_at', 'timestamp')
    .addColumn('revoked_at', 'timestamp')
    .addColumn('revoked_by', 'varchar(36)')
    .addColumn('revoke_reason', 'varchar(255)')
    .addColumn('is_mfa_verified', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('security_stamp', 'varchar(255)')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .alterTable('sessions')
    .addForeignKeyConstraint('fk_sessions_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  // ============================================
  // 7. EMAIL_VERIFICATION_TOKENS TABLE
  // ============================================
  await db.schema
    .createTable('email_verification_tokens')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('user_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('email', 'varchar(255)', (col) => col.notNull())
    .addColumn('token_hash', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('expires_at', 'timestamp', (col) => col.notNull())
    .addColumn('verified_at', 'timestamp')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .alterTable('email_verification_tokens')
    .addForeignKeyConstraint('fk_email_verification_tokens_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  // ============================================
  // 8. PASSWORD_RESET_TOKENS TABLE
  // ============================================
  await db.schema
    .createTable('password_reset_tokens')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('user_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('token_hash', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('expires_at', 'timestamp', (col) => col.notNull())
    .addColumn('used_at', 'timestamp')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .alterTable('password_reset_tokens')
    .addForeignKeyConstraint('fk_password_reset_tokens_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  // ============================================
  // 9. API_KEYS TABLE
  // ============================================
  await db.schema
    .createTable('api_keys')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('user_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('key_hash', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('key_hint', 'varchar(8)', (col) => col.notNull())
    .addColumn('scopes', 'json', (col) => col.notNull())
    .addColumn('allowed_ips', 'json')
    .addColumn('allowed_origins', 'json')
    .addColumn('last_used_at', 'timestamp')
    .addColumn('last_used_ip', 'varchar(45)')
    .addColumn('usage_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('expires_at', 'timestamp')
    .addColumn('revoked_at', 'timestamp')
    .addColumn('revoked_by', 'varchar(36)')
    .addColumn('revoke_reason', 'varchar(255)')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .alterTable('api_keys')
    .addForeignKeyConstraint('fk_api_keys_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  // ============================================
  // 10. TWO_FACTOR_SECRETS TABLE
  // ============================================
  await db.schema
    .createTable('two_factor_secrets')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('user_id', 'varchar(36)', (col) => col.notNull().unique())
    .addColumn('secret', 'text', (col) => col.notNull())
    .addColumn('backup_codes', 'json', (col) => col.notNull())
    .addColumn('verified_at', 'timestamp')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .alterTable('two_factor_secrets')
    .addForeignKeyConstraint('fk_two_factor_secrets_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  // ============================================
  // CREATE INDEXES
  // ============================================

  // Users indexes
  await db.schema.createIndex('idx_users_email').on('users').column('email').execute();
  await db.schema.createIndex('idx_users_username').on('users').column('username').execute();
  await db.schema
    .createIndex('idx_users_organization_id')
    .on('users')
    .column('organization_id')
    .execute();
  await db.schema.createIndex('idx_users_status').on('users').column('status').execute();
  await db.schema.createIndex('idx_users_deleted_at').on('users').column('deleted_at').execute();

  // User passwords indexes
  await db.schema
    .createIndex('idx_user_passwords_user_id')
    .on('user_passwords')
    .column('user_id')
    .execute();
  await db.schema
    .createIndex('idx_user_passwords_expires_at')
    .on('user_passwords')
    .column('expires_at')
    .execute();

  // Auth providers indexes
  await db.schema
    .createIndex('idx_user_auth_providers_user_id')
    .on('user_auth_providers')
    .column('user_id')
    .execute();
  await db.schema
    .createIndex('idx_user_auth_providers_provider')
    .on('user_auth_providers')
    .columns(['provider', 'provider_user_id'])
    .execute();

  // Sessions indexes
  await db.schema.createIndex('idx_sessions_user_id').on('sessions').column('user_id').execute();
  await db.schema
    .createIndex('idx_sessions_expires_at')
    .on('sessions')
    .column('expires_at')
    .execute();
  await db.schema
    .createIndex('idx_sessions_device_id')
    .on('sessions')
    .columns(['user_id', 'device_id'])
    .execute();

  // API keys indexes
  await db.schema.createIndex('idx_api_keys_user_id').on('api_keys').column('user_id').execute();
  await db.schema
    .createIndex('idx_api_keys_expires_at')
    .on('api_keys')
    .column('expires_at')
    .execute();

  console.log('✅ Created users and auth tables with indexes');
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop foreign key constraints first
  await db.schema
    .alterTable('two_factor_secrets')
    .dropConstraint('fk_two_factor_secrets_user')
    .ifExists()
    .execute();
  await db.schema.alterTable('api_keys').dropConstraint('fk_api_keys_user').ifExists().execute();
  await db.schema
    .alterTable('password_reset_tokens')
    .dropConstraint('fk_password_reset_tokens_user')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('email_verification_tokens')
    .dropConstraint('fk_email_verification_tokens_user')
    .ifExists()
    .execute();
  await db.schema.alterTable('sessions').dropConstraint('fk_sessions_user').ifExists().execute();
  await db.schema
    .alterTable('auth_providers')
    .dropConstraint('fk_auth_providers_organization')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('user_security')
    .dropConstraint('fk_user_security_user')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('user_auth_providers')
    .dropConstraint('fk_user_auth_providers_user')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('user_passwords')
    .dropConstraint('fk_user_passwords_user')
    .ifExists()
    .execute();
  await db.schema.alterTable('users').dropConstraint('fk_users_organization').ifExists().execute();

  // Drop tables in reverse order
  await db.schema.dropTable('two_factor_secrets').ifExists().execute();
  await db.schema.dropTable('api_keys').ifExists().execute();
  await db.schema.dropTable('password_reset_tokens').ifExists().execute();
  await db.schema.dropTable('email_verification_tokens').ifExists().execute();
  await db.schema.dropTable('sessions').ifExists().execute();
  await db.schema.dropTable('auth_providers').ifExists().execute();
  await db.schema.dropTable('user_security').ifExists().execute();
  await db.schema.dropTable('user_auth_providers').ifExists().execute();
  await db.schema.dropTable('user_passwords').ifExists().execute();
  await db.schema.dropTable('users').ifExists().execute();

  console.log('✅ Dropped users and auth tables');
}
