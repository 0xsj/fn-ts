// migrations/001750999233_create_analytics_tables.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ============================================
  // 1. AUDIT_LOGS TABLE
  // ============================================
  await db.schema
    .createTable('audit_logs')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('entity_type', 'varchar(50)', (col) => col.notNull())
    .addColumn('entity_id', 'varchar(36)', (col) => col.notNull())
    .addColumn(
      'action',
      sql`enum('create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import')`,
      (col) => col.notNull(),
    )
    .addColumn('user_id', 'varchar(36)')
    .addColumn('user_email', 'varchar(255)')
    .addColumn('user_role', 'varchar(50)')
    .addColumn('ip_address', 'varchar(45)')
    .addColumn('user_agent', 'text')
    .addColumn('correlation_id', 'varchar(36)')
    .addColumn('changes', 'json')
    .addColumn('status', sql`enum('success', 'failure')`, (col) => col.notNull())
    .addColumn('error_message', 'text')
    .addColumn('duration_ms', 'integer')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('audit_logs')
    .addForeignKeyConstraint('fk_audit_logs_user', ['user_id'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  // ============================================
  // 2. EVENTS TABLE (Event Sourcing)
  // ============================================
  await db.schema
    .createTable('events')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('event_type', 'varchar(100)', (col) => col.notNull())
    .addColumn('event_version', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('aggregate_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('aggregate_type', 'varchar(50)', (col) => col.notNull())
    .addColumn('sequence_number', 'integer', (col) => col.notNull())
    .addColumn('payload', 'json', (col) => col.notNull())
    .addColumn('correlation_id', 'varchar(36)')
    .addColumn('causation_id', 'varchar(36)')
    .addColumn('user_id', 'varchar(36)')
    .addColumn('processed_at', 'timestamp')
    .addColumn('failed_at', 'timestamp')
    .addColumn('retry_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('events')
    .addForeignKeyConstraint('fk_events_user', ['user_id'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  // ============================================
  // 3. METRICS TABLE
  // ============================================
  await db.schema
    .createTable('metrics')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('name', 'varchar(100)', (col) => col.notNull())
    .addColumn('value', sql`double`, (col) => col.notNull())
    .addColumn('unit', 'varchar(20)')
    .addColumn('type', sql`enum('counter', 'gauge', 'histogram', 'summary')`, (col) =>
      col.notNull(),
    )
    .addColumn('tags', 'json', (col) => col.notNull())
    .addColumn('timestamp', 'timestamp', (col) => col.notNull())
    .addColumn('period_start', 'timestamp')
    .addColumn('period_end', 'timestamp')
    .addColumn('count', 'integer')
    .addColumn('sum', sql`double`)
    .addColumn('min', sql`double`)
    .addColumn('max', sql`double`)
    .addColumn('avg', sql`double`)
    .addColumn('p50', sql`double`)
    .addColumn('p95', sql`double`)
    .addColumn('p99', sql`double`)
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // ============================================
  // 4. ACTIVITY_LOGS TABLE
  // ============================================
  await db.schema
    .createTable('activity_logs')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('actor_type', sql`enum('user', 'system', 'api')`, (col) => col.notNull())
    .addColumn('actor_id', 'varchar(36)')
    .addColumn('activity_type', 'varchar(100)', (col) => col.notNull())
    .addColumn('activity_category', sql`enum('view', 'action', 'navigation', 'system')`, (col) =>
      col.notNull(),
    )
    .addColumn('resource_type', 'varchar(50)')
    .addColumn('resource_id', 'varchar(36)')
    .addColumn('details', 'json')
    .addColumn('session_id', 'varchar(36)')
    .addColumn('duration_ms', 'integer')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // ============================================
  // CREATE INDEXES
  // ============================================

  // Audit logs indexes
  await db.schema
    .createIndex('idx_audit_logs_entity')
    .on('audit_logs')
    .columns(['entity_type', 'entity_id'])
    .execute();
  await db.schema
    .createIndex('idx_audit_logs_user_id')
    .on('audit_logs')
    .column('user_id')
    .execute();
  await db.schema.createIndex('idx_audit_logs_action').on('audit_logs').column('action').execute();
  await db.schema.createIndex('idx_audit_logs_status').on('audit_logs').column('status').execute();
  await db.schema
    .createIndex('idx_audit_logs_created_at')
    .on('audit_logs')
    .column('created_at')
    .execute();
  await db.schema
    .createIndex('idx_audit_logs_correlation_id')
    .on('audit_logs')
    .column('correlation_id')
    .execute();

  // Events indexes
  await db.schema
    .createIndex('idx_events_aggregate')
    .on('events')
    .columns(['aggregate_type', 'aggregate_id'])
    .execute();
  await db.schema.createIndex('idx_events_type').on('events').column('event_type').execute();
  await db.schema.createIndex('idx_events_user_id').on('events').column('user_id').execute();
  await db.schema
    .createIndex('idx_events_correlation_id')
    .on('events')
    .column('correlation_id')
    .execute();
  await db.schema
    .createIndex('idx_events_processed_at')
    .on('events')
    .column('processed_at')
    .execute();
  await db.schema.createIndex('idx_events_created_at').on('events').column('created_at').execute();

  // Metrics indexes
  await db.schema.createIndex('idx_metrics_name').on('metrics').column('name').execute();
  await db.schema.createIndex('idx_metrics_timestamp').on('metrics').column('timestamp').execute();
  await db.schema
    .createIndex('idx_metrics_name_timestamp')
    .on('metrics')
    .columns(['name', 'timestamp'])
    .execute();
  await db.schema.createIndex('idx_metrics_type').on('metrics').column('type').execute();

  // Activity logs indexes
  await db.schema
    .createIndex('idx_activity_logs_actor')
    .on('activity_logs')
    .columns(['actor_type', 'actor_id'])
    .execute();
  await db.schema
    .createIndex('idx_activity_logs_activity_type')
    .on('activity_logs')
    .column('activity_type')
    .execute();
  await db.schema
    .createIndex('idx_activity_logs_resource')
    .on('activity_logs')
    .columns(['resource_type', 'resource_id'])
    .execute();
  await db.schema
    .createIndex('idx_activity_logs_session_id')
    .on('activity_logs')
    .column('session_id')
    .execute();
  await db.schema
    .createIndex('idx_activity_logs_created_at')
    .on('activity_logs')
    .column('created_at')
    .execute();

  console.log('✅ Created analytics tables with indexes');
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop foreign key constraints first
  await db.schema.alterTable('events').dropConstraint('fk_events_user').ifExists().execute();
  await db.schema
    .alterTable('audit_logs')
    .dropConstraint('fk_audit_logs_user')
    .ifExists()
    .execute();

  // Drop tables
  await db.schema.dropTable('activity_logs').ifExists().execute();
  await db.schema.dropTable('metrics').ifExists().execute();
  await db.schema.dropTable('events').ifExists().execute();
  await db.schema.dropTable('audit_logs').ifExists().execute();

  console.log('✅ Dropped analytics tables');
}
