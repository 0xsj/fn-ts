// src/infrastructure/database/migrations/001751001218_create_collections_tables.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ============================================
  // 1. COLLECTION TYPE CONFIGURATIONS TABLE
  // ============================================
  await db.schema
    .createTable('collection_type_configs')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('type_key', 'varchar(100)', (col) => col.notNull())
    .addColumn('display_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('display_name_plural', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('icon', 'varchar(100)')
    .addColumn('color', 'varchar(50)')
    .addColumn('organization_id', 'varchar(36)', (col) => col.notNull())

    // JSON columns for configuration data
    .addColumn('statuses', 'json', (col) => col.notNull())
    .addColumn('priorities', 'json', (col) => col.notNull())
    .addColumn('field_definitions', 'json', (col) => col.notNull())
    .addColumn('item_types', 'json', (col) => col.notNull().defaultTo('[]'))
    .addColumn('permissions', 'json', (col) => col.notNull())
    .addColumn('ui_config', 'json', (col) => col.notNull())
    .addColumn('integrations', 'json', (col) => col.notNull())
    .addColumn('settings', 'json', (col) => col.notNull())

    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_by', 'varchar(36)', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys and indexes for collection_type_configs
  await db.schema
    .alterTable('collection_type_configs')
    .addForeignKeyConstraint(
      'fk_collection_type_configs_organization',
      ['organization_id'],
      'organizations',
      ['id'],
    )
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('collection_type_configs')
    .addForeignKeyConstraint('fk_collection_type_configs_created_by', ['created_by'], 'users', [
      'id',
    ])
    .onDelete('restrict')
    .execute();

  // ============================================
  // 2. COLLECTIONS TABLE
  // ============================================
  await db.schema
    .createTable('collections')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('collection_number', 'varchar(100)', (col) => col.notNull())
    .addColumn('title', 'varchar(500)', (col) => col.notNull())
    .addColumn('description', 'text')

    // Type and classification
    .addColumn('collection_type', 'varchar(100)', (col) => col.notNull())
    .addColumn('sub_type', 'varchar(100)')

    // Status and priority (stored as strings to match configured values)
    .addColumn('status', 'varchar(100)', (col) => col.notNull())
    .addColumn('priority', 'varchar(100)', (col) => col.notNull())

    // Assignment and ownership
    .addColumn('assigned_to_user_id', 'varchar(36)')
    .addColumn('assigned_to_team', 'varchar(255)')
    .addColumn('owner_user_id', 'varchar(36)')
    .addColumn('created_by_user_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('organization_id', 'varchar(36)', (col) => col.notNull())

    // Timing
    .addColumn('due_at', 'timestamp')
    .addColumn('started_at', 'timestamp')
    .addColumn('completed_at', 'timestamp')
    .addColumn('closed_at', 'timestamp')

    // External integration
    .addColumn(
      'source',
      sql`enum('manual', 'automated', 'imported', 'api', 'integration', 'system')`,
      (col) => col.notNull().defaultTo('manual'),
    )
    .addColumn('external_id', 'varchar(255)')
    .addColumn('external_data', 'json')

    // Custom fields and relationships
    .addColumn('custom_fields', 'json', (col) => col.notNull().defaultTo('{}'))
    .addColumn('parent_collection_id', 'varchar(36)')
    .addColumn('related_collection_ids', 'json', (col) => col.notNull().defaultTo('[]'))

    // Communication
    .addColumn('primary_thread_id', 'varchar(36)')

    // Metrics and tracking
    .addColumn('metrics', 'json', (col) => col.notNull())
    .addColumn('flags', 'json', (col) => col.notNull())
    .addColumn('tags', 'json', (col) => col.notNull().defaultTo('[]'))

    // Workflow
    .addColumn('workflow_state', 'json')
    .addColumn('approval_status', sql`enum('pending', 'approved', 'rejected')`)
    .addColumn('approved_by', 'varchar(36)')
    .addColumn('approved_at', 'timestamp')
    .addColumn('approval_notes', 'text')

    // Activity tracking
    .addColumn('last_activity_at', 'timestamp')
    .addColumn('last_activity_type', 'varchar(100)')
    .addColumn('last_activity_user_id', 'varchar(36)')

    // Standard timestamps
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )

    // Soft delete
    .addColumn('deleted_at', 'timestamp')
    .addColumn('deleted_by', 'varchar(36)')
    .execute();

  // Add foreign keys for collections
  await db.schema
    .alterTable('collections')
    .addForeignKeyConstraint('fk_collections_organization', ['organization_id'], 'organizations', [
      'id',
    ])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('collections')
    .addForeignKeyConstraint('fk_collections_created_by', ['created_by_user_id'], 'users', ['id'])
    .onDelete('restrict')
    .execute();

  await db.schema
    .alterTable('collections')
    .addForeignKeyConstraint('fk_collections_assigned_to', ['assigned_to_user_id'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('collections')
    .addForeignKeyConstraint('fk_collections_owner', ['owner_user_id'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('collections')
    .addForeignKeyConstraint('fk_collections_parent', ['parent_collection_id'], 'collections', [
      'id',
    ])
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('collections')
    .addForeignKeyConstraint('fk_collections_thread', ['primary_thread_id'], 'threads', ['id'])
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('collections')
    .addForeignKeyConstraint('fk_collections_approved_by', ['approved_by'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('collections')
    .addForeignKeyConstraint('fk_collections_deleted_by', ['deleted_by'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('collections')
    .addForeignKeyConstraint(
      'fk_collections_last_activity_user',
      ['last_activity_user_id'],
      'users',
      ['id'],
    )
    .onDelete('set null')
    .execute();

  // ============================================
  // 3. COLLECTION ITEMS TABLE
  // ============================================
  await db.schema
    .createTable('collection_items')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('collection_id', 'varchar(36)', (col) => col.notNull())

    // Item classification and content
    .addColumn('item_type', 'varchar(100)', (col) => col.notNull())
    .addColumn('title', 'varchar(500)')
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('structured_data', 'json')

    // Authorship
    .addColumn('created_by_user_id', 'varchar(36)', (col) => col.notNull())

    // Visibility and access control
    .addColumn('visibility', sql`enum('public', 'internal', 'restricted', 'private')`, (col) =>
      col.notNull().defaultTo('internal'),
    )
    .addColumn('access_control', 'json', (col) => col.notNull())

    // Attachments
    .addColumn('file_ids', 'json', (col) => col.notNull().defaultTo('[]'))

    // Timing
    .addColumn('occurred_at', 'timestamp')
    .addColumn('valid_from', 'timestamp')
    .addColumn('valid_until', 'timestamp')

    // Priority and actions
    .addColumn('priority', sql`enum('low', 'normal', 'high', 'urgent')`, (col) =>
      col.notNull().defaultTo('normal'),
    )
    .addColumn('requires_action', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('action_due_at', 'timestamp')
    .addColumn('action_assigned_to', 'varchar(36)')

    // Status tracking
    .addColumn('status', sql`enum('active', 'resolved', 'archived', 'superseded')`, (col) =>
      col.notNull().defaultTo('active'),
    )
    .addColumn('resolved_at', 'timestamp')
    .addColumn('resolved_by', 'varchar(36)')

    // Relationships
    .addColumn('parent_item_id', 'varchar(36)')
    .addColumn('thread_id', 'varchar(36)')

    // Flexible properties and organization
    .addColumn('properties', 'json', (col) => col.notNull().defaultTo('{}'))
    .addColumn('tags', 'json', (col) => col.notNull().defaultTo('[]'))
    .addColumn('order_index', 'integer', (col) => col.notNull().defaultTo(0))

    // Standard timestamps
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys for collection_items
  await db.schema
    .alterTable('collection_items')
    .addForeignKeyConstraint('fk_collection_items_collection', ['collection_id'], 'collections', [
      'id',
    ])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('collection_items')
    .addForeignKeyConstraint('fk_collection_items_created_by', ['created_by_user_id'], 'users', [
      'id',
    ])
    .onDelete('restrict')
    .execute();

  await db.schema
    .alterTable('collection_items')
    .addForeignKeyConstraint(
      'fk_collection_items_action_assigned',
      ['action_assigned_to'],
      'users',
      ['id'],
    )
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('collection_items')
    .addForeignKeyConstraint('fk_collection_items_resolved_by', ['resolved_by'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('collection_items')
    .addForeignKeyConstraint('fk_collection_items_parent', ['parent_item_id'], 'collection_items', [
      'id',
    ])
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('collection_items')
    .addForeignKeyConstraint('fk_collection_items_thread', ['thread_id'], 'threads', ['id'])
    .onDelete('set null')
    .execute();

  // ============================================
  // CREATE INDEXES
  // ============================================

  // Collection Type Configs indexes
  await db.schema
    .createIndex('idx_collection_type_configs_organization_type')
    .on('collection_type_configs')
    .columns(['organization_id', 'type_key'])
    .execute();

  await db.schema
    .createIndex('idx_collection_type_configs_active')
    .on('collection_type_configs')
    .columns(['organization_id', 'is_active'])
    .execute();

  // Collections indexes
  await db.schema
    .createIndex('idx_collections_organization_type')
    .on('collections')
    .columns(['organization_id', 'collection_type'])
    .execute();

  await db.schema
    .createIndex('idx_collections_number')
    .on('collections')
    .columns(['organization_id', 'collection_number'])
    .execute();

  await db.schema
    .createIndex('idx_collections_status')
    .on('collections')
    .columns(['organization_id', 'status'])
    .execute();

  await db.schema
    .createIndex('idx_collections_priority')
    .on('collections')
    .columns(['organization_id', 'priority'])
    .execute();

  await db.schema
    .createIndex('idx_collections_assigned_to')
    .on('collections')
    .column('assigned_to_user_id')
    .execute();

  await db.schema
    .createIndex('idx_collections_created_by')
    .on('collections')
    .column('created_by_user_id')
    .execute();

  await db.schema
    .createIndex('idx_collections_owner')
    .on('collections')
    .column('owner_user_id')
    .execute();

  await db.schema
    .createIndex('idx_collections_external')
    .on('collections')
    .columns(['organization_id', 'external_id', 'source'])
    .execute();

  await db.schema
    .createIndex('idx_collections_parent')
    .on('collections')
    .column('parent_collection_id')
    .execute();

  await db.schema
    .createIndex('idx_collections_dates')
    .on('collections')
    .columns(['organization_id', 'created_at'])
    .execute();

  await db.schema
    .createIndex('idx_collections_due_dates')
    .on('collections')
    .columns(['organization_id', 'due_at'])
    .execute();

  await db.schema
    .createIndex('idx_collections_completed')
    .on('collections')
    .columns(['organization_id', 'completed_at'])
    .execute();

  await db.schema
    .createIndex('idx_collections_deleted')
    .on('collections')
    .column('deleted_at')
    .execute();

  await db.schema
    .createIndex('idx_collections_approval')
    .on('collections')
    .columns(['organization_id', 'approval_status'])
    .execute();

  await db.schema
    .createIndex('idx_collections_activity')
    .on('collections')
    .columns(['organization_id', 'last_activity_at'])
    .execute();

  // Collection Items indexes
  await db.schema
    .createIndex('idx_collection_items_collection')
    .on('collection_items')
    .column('collection_id')
    .execute();

  await db.schema
    .createIndex('idx_collection_items_type')
    .on('collection_items')
    .columns(['collection_id', 'item_type'])
    .execute();

  await db.schema
    .createIndex('idx_collection_items_status')
    .on('collection_items')
    .columns(['collection_id', 'status'])
    .execute();

  await db.schema
    .createIndex('idx_collection_items_priority')
    .on('collection_items')
    .columns(['collection_id', 'priority'])
    .execute();

  await db.schema
    .createIndex('idx_collection_items_created_by')
    .on('collection_items')
    .column('created_by_user_id')
    .execute();

  await db.schema
    .createIndex('idx_collection_items_assigned')
    .on('collection_items')
    .column('action_assigned_to')
    .execute();

  await db.schema
    .createIndex('idx_collection_items_parent')
    .on('collection_items')
    .column('parent_item_id')
    .execute();

  await db.schema
    .createIndex('idx_collection_items_order')
    .on('collection_items')
    .columns(['collection_id', 'order_index'])
    .execute();

  await db.schema
    .createIndex('idx_collection_items_dates')
    .on('collection_items')
    .columns(['collection_id', 'created_at'])
    .execute();

  await db.schema
    .createIndex('idx_collection_items_action_due')
    .on('collection_items')
    .columns(['action_assigned_to', 'action_due_at'])
    .execute();

  // ============================================
  // ADD UNIQUE CONSTRAINTS
  // ============================================

  // Unique collection type key per organization
  await db.schema
    .createIndex('uniq_collection_type_configs_org_key')
    .on('collection_type_configs')
    .columns(['organization_id', 'type_key'])
    .unique()
    .execute();

  // Unique collection number per organization
  await db.schema
    .createIndex('uniq_collections_org_number')
    .on('collections')
    .columns(['organization_id', 'collection_number'])
    .unique()
    .execute();

  // Unique external ID per organization and source
  await db.schema
    .createIndex('uniq_collections_org_external')
    .on('collections')
    .columns(['organization_id', 'external_id', 'source'])
    .unique()
    .where('external_id', 'is not', null)
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop tables in reverse order due to foreign key constraints
  await db.schema.dropTable('collection_items').execute();
  await db.schema.dropTable('collections').execute();
  await db.schema.dropTable('collection_type_configs').execute();
}
