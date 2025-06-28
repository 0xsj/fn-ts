// migrations/001750999212_create_access_control_tables.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ============================================
  // 1. PERMISSIONS TABLE
  // ============================================
  await db.schema
    .createTable('permissions')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('name', 'varchar(100)', (col) => col.notNull().unique())
    .addColumn('slug', 'varchar(100)', (col) => col.notNull().unique())
    .addColumn('description', 'text')
    .addColumn('category', 'varchar(50)', (col) => col.notNull())
    .addColumn('resource', 'varchar(50)', (col) => col.notNull())
    .addColumn('action', 'varchar(50)', (col) => col.notNull())
    .addColumn('is_system', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // ============================================
  // 2. ROLES TABLE
  // ============================================
  await db.schema
    .createTable('roles')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('name', 'varchar(100)', (col) => col.notNull())
    .addColumn('slug', 'varchar(100)', (col) => col.notNull().unique())
    .addColumn('description', 'text')
    .addColumn('type', sql`enum('system', 'organization', 'custom')`, (col) =>
      col.notNull().defaultTo('custom'),
    )
    .addColumn('is_system', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('is_default', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('organization_id', 'varchar(36)')
    .addColumn('created_by', 'varchar(36)')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('roles')
    .addForeignKeyConstraint('fk_roles_organization', ['organization_id'], 'organizations', ['id'])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('roles')
    .addForeignKeyConstraint('fk_roles_created_by', ['created_by'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  // ============================================
  // 3. ROLE_PERMISSIONS TABLE (Junction)
  // ============================================
  await db.schema
    .createTable('role_permissions')
    .addColumn('role_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('permission_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('granted_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('granted_by', 'varchar(36)')
    .addPrimaryKeyConstraint('pk_role_permissions', ['role_id', 'permission_id'])
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('role_permissions')
    .addForeignKeyConstraint('fk_role_permissions_role', ['role_id'], 'roles', ['id'])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('role_permissions')
    .addForeignKeyConstraint('fk_role_permissions_permission', ['permission_id'], 'permissions', [
      'id',
    ])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('role_permissions')
    .addForeignKeyConstraint('fk_role_permissions_granted_by', ['granted_by'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  // ============================================
  // 4. USER_ROLES TABLE (Junction)
  // ============================================
  await db.schema
    .createTable('user_roles')
    .addColumn('user_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('role_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('assigned_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('assigned_by', 'varchar(36)')
    .addColumn('expires_at', 'timestamp')
    .addColumn('organization_id', 'varchar(36)')
    .addPrimaryKeyConstraint('pk_user_roles', ['user_id', 'role_id'])
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('user_roles')
    .addForeignKeyConstraint('fk_user_roles_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('user_roles')
    .addForeignKeyConstraint('fk_user_roles_role', ['role_id'], 'roles', ['id'])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('user_roles')
    .addForeignKeyConstraint('fk_user_roles_assigned_by', ['assigned_by'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('user_roles')
    .addForeignKeyConstraint('fk_user_roles_organization', ['organization_id'], 'organizations', [
      'id',
    ])
    .onDelete('cascade')
    .execute();

  // ============================================
  // 5. ORGANIZATION_MEMBERS TABLE
  // ============================================
  await db.schema
    .createTable('organization_members')
    .addColumn('organization_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('user_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('role', sql`enum('owner', 'admin', 'member', 'viewer', 'guest')`, (col) =>
      col.notNull().defaultTo('member'),
    )
    .addColumn('status', sql`enum('active', 'invited', 'suspended')`, (col) =>
      col.notNull().defaultTo('invited'),
    )
    .addColumn('invited_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('invited_by', 'varchar(36)', (col) => col.notNull())
    .addColumn('invitation_token', 'varchar(255)')
    .addColumn('invitation_expires_at', 'timestamp')
    .addColumn('joined_at', 'timestamp')
    .addColumn('custom_permissions', 'json', (col) => col.notNull())
    .addColumn('last_active_at', 'timestamp')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .addPrimaryKeyConstraint('pk_organization_members', ['organization_id', 'user_id'])
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('organization_members')
    .addForeignKeyConstraint('fk_organization_members_org', ['organization_id'], 'organizations', [
      'id',
    ])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('organization_members')
    .addForeignKeyConstraint('fk_organization_members_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('organization_members')
    .addForeignKeyConstraint('fk_organization_members_invited_by', ['invited_by'], 'users', ['id'])
    .onDelete('restrict')
    .execute();

  // ============================================
  // CREATE INDEXES
  // ============================================

  // Permissions indexes
  await db.schema
    .createIndex('idx_permissions_resource_action')
    .on('permissions')
    .columns(['resource', 'action'])
    .execute();
  await db.schema
    .createIndex('idx_permissions_category')
    .on('permissions')
    .column('category')
    .execute();

  // Roles indexes
  await db.schema
    .createIndex('idx_roles_organization_id')
    .on('roles')
    .column('organization_id')
    .execute();
  await db.schema.createIndex('idx_roles_type').on('roles').column('type').execute();

  // User roles indexes
  await db.schema
    .createIndex('idx_user_roles_user_id')
    .on('user_roles')
    .column('user_id')
    .execute();
  await db.schema
    .createIndex('idx_user_roles_role_id')
    .on('user_roles')
    .column('role_id')
    .execute();
  await db.schema
    .createIndex('idx_user_roles_expires_at')
    .on('user_roles')
    .column('expires_at')
    .execute();

  // Organization members indexes
  await db.schema
    .createIndex('idx_organization_members_user_id')
    .on('organization_members')
    .column('user_id')
    .execute();
  await db.schema
    .createIndex('idx_organization_members_status')
    .on('organization_members')
    .column('status')
    .execute();
  await db.schema
    .createIndex('idx_organization_members_invitation_token')
    .on('organization_members')
    .column('invitation_token')
    .execute();

  console.log('✅ Created access control tables with indexes');
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop foreign key constraints first
  await db.schema
    .alterTable('organization_members')
    .dropConstraint('fk_organization_members_invited_by')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('organization_members')
    .dropConstraint('fk_organization_members_user')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('organization_members')
    .dropConstraint('fk_organization_members_org')
    .ifExists()
    .execute();

  await db.schema
    .alterTable('user_roles')
    .dropConstraint('fk_user_roles_organization')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('user_roles')
    .dropConstraint('fk_user_roles_assigned_by')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('user_roles')
    .dropConstraint('fk_user_roles_role')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('user_roles')
    .dropConstraint('fk_user_roles_user')
    .ifExists()
    .execute();

  await db.schema
    .alterTable('role_permissions')
    .dropConstraint('fk_role_permissions_granted_by')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('role_permissions')
    .dropConstraint('fk_role_permissions_permission')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('role_permissions')
    .dropConstraint('fk_role_permissions_role')
    .ifExists()
    .execute();

  await db.schema.alterTable('roles').dropConstraint('fk_roles_created_by').ifExists().execute();
  await db.schema.alterTable('roles').dropConstraint('fk_roles_organization').ifExists().execute();

  // Drop tables
  await db.schema.dropTable('organization_members').ifExists().execute();
  await db.schema.dropTable('user_roles').ifExists().execute();
  await db.schema.dropTable('role_permissions').ifExists().execute();
  await db.schema.dropTable('roles').ifExists().execute();
  await db.schema.dropTable('permissions').ifExists().execute();

  console.log('✅ Dropped access control tables');
}
