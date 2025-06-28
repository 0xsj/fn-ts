// migrations/001750999218_create_operations_tables.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ============================================
  // 1. TASKS TABLE
  // ============================================
  await db.schema
    .createTable('tasks')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('type', sql`enum('manual', 'automated', 'scheduled', 'triggered')`, (col) =>
      col.notNull().defaultTo('manual'),
    )
    .addColumn(
      'status',
      sql`enum('pending', 'queued', 'running', 'completed', 'failed', 'cancelled', 'stalled')`,
      (col) => col.notNull().defaultTo('pending'),
    )
    .addColumn('priority', sql`enum('critical', 'high', 'normal', 'low')`, (col) =>
      col.notNull().defaultTo('normal'),
    )
    .addColumn('assignee_id', 'varchar(36)')
    .addColumn('assignee_type', sql`enum('user', 'system', 'bot')`, (col) =>
      col.notNull().defaultTo('user'),
    )
    .addColumn('payload', 'json', (col) => col.notNull())
    .addColumn('result', 'json')
    .addColumn('error', 'json')
    .addColumn('attempts', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('max_attempts', 'integer', (col) => col.notNull().defaultTo(3))
    .addColumn('scheduled_for', 'timestamp')
    .addColumn('started_at', 'timestamp')
    .addColumn('completed_at', 'timestamp')
    .addColumn('failed_at', 'timestamp')
    .addColumn('stalled_at', 'timestamp')
    .addColumn('next_retry_at', 'timestamp')
    .addColumn('timeout_ms', 'integer', (col) => col.notNull().defaultTo(300000))
    .addColumn('stall_timeout_ms', 'integer', (col) => col.notNull().defaultTo(60000))
    .addColumn('progress', 'json', (col) => col.notNull())
    .addColumn('queue_name', 'varchar(100)', (col) => col.notNull().defaultTo('default'))
    .addColumn('worker_id', 'varchar(255)')
    .addColumn('depends_on', 'json', (col) => col.notNull())
    .addColumn('parent_task_id', 'varchar(36)')
    .addColumn('child_task_ids', 'json', (col) => col.notNull())
    .addColumn('created_by', 'varchar(36)')
    .addColumn('organization_id', 'varchar(36)')
    .addColumn('tags', 'json', (col) => col.notNull())
    .addColumn('correlation_id', 'varchar(36)')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('tasks')
    .addForeignKeyConstraint('fk_tasks_assignee', ['assignee_id'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('tasks')
    .addForeignKeyConstraint('fk_tasks_parent', ['parent_task_id'], 'tasks', ['id'])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('tasks')
    .addForeignKeyConstraint('fk_tasks_created_by', ['created_by'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('tasks')
    .addForeignKeyConstraint('fk_tasks_organization', ['organization_id'], 'organizations', ['id'])
    .onDelete('cascade')
    .execute();

  // ============================================
  // 2. WEBHOOKS TABLE
  // ============================================
  await db.schema
    .createTable('webhooks')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('url', 'varchar(500)', (col) => col.notNull())
    .addColumn('events', 'json', (col) => col.notNull())
    .addColumn('auth_type', sql`enum('none', 'basic', 'bearer', 'api_key', 'hmac')`, (col) =>
      col.notNull().defaultTo('none'),
    )
    .addColumn('auth_credentials', 'json')
    .addColumn('secret', 'varchar(255)')
    .addColumn('method', sql`enum('POST', 'PUT', 'PATCH')`, (col) =>
      col.notNull().defaultTo('POST'),
    )
    .addColumn('headers', 'json', (col) => col.notNull())
    .addColumn('retry_enabled', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('max_retries', 'integer', (col) => col.notNull().defaultTo(3))
    .addColumn('retry_delay_ms', 'integer', (col) => col.notNull().defaultTo(5000))
    .addColumn('timeout_ms', 'integer', (col) => col.notNull().defaultTo(30000))
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('is_verified', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('verified_at', 'timestamp')
    .addColumn('rate_limit_per_hour', 'integer')
    .addColumn('consecutive_failures', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('last_failure_at', 'timestamp')
    .addColumn('last_failure_reason', 'text')
    .addColumn('disabled_at', 'timestamp')
    .addColumn('last_success_at', 'timestamp')
    .addColumn('total_deliveries', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('total_failures', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_by', 'varchar(36)', (col) => col.notNull())
    .addColumn('organization_id', 'varchar(36)')
    .addColumn('filters', 'json')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('webhooks')
    .addForeignKeyConstraint('fk_webhooks_created_by', ['created_by'], 'users', ['id'])
    .onDelete('restrict')
    .execute();

  await db.schema
    .alterTable('webhooks')
    .addForeignKeyConstraint('fk_webhooks_organization', ['organization_id'], 'organizations', [
      'id',
    ])
    .onDelete('cascade')
    .execute();

  // ============================================
  // 3. WEBHOOK_DELIVERIES TABLE
  // ============================================
  await db.schema
    .createTable('webhook_deliveries')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('webhook_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('event_type', 'varchar(100)', (col) => col.notNull())
    .addColumn('event_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('request', 'json', (col) => col.notNull())
    .addColumn('response', 'json')
    .addColumn('attempt_number', 'integer', (col) => col.notNull())
    .addColumn('duration_ms', 'integer')
    .addColumn('status', sql`enum('pending', 'success', 'failed', 'timeout')`, (col) =>
      col.notNull(),
    )
    .addColumn('delivered_at', 'timestamp')
    .addColumn('failed_at', 'timestamp')
    .addColumn('will_retry', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('next_retry_at', 'timestamp')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('webhook_deliveries')
    .addForeignKeyConstraint('fk_webhook_deliveries_webhook', ['webhook_id'], 'webhooks', ['id'])
    .onDelete('cascade')
    .execute();

  // ============================================
  // 4. FEATURE_FLAGS TABLE
  // ============================================
  await db.schema
    .createTable('feature_flags')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('key', 'varchar(100)', (col) => col.notNull().unique())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('enabled', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('rules', 'json', (col) => col.notNull())
    .addColumn('variations', 'json', (col) => col.notNull())
    .addColumn('default_variation', 'varchar(50)', (col) => col.notNull().defaultTo('control'))
    .addColumn('rollout_percentage', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('sticky_sessions', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('type', sql`enum('release', 'experiment', 'permission', 'ops')`, (col) =>
      col.notNull().defaultTo('release'),
    )
    .addColumn('stage', sql`enum('development', 'staging', 'production', 'deprecated')`, (col) =>
      col.notNull().defaultTo('development'),
    )
    .addColumn('owner_id', 'varchar(36)')
    .addColumn('organization_id', 'varchar(36)')
    .addColumn('tags', 'json', (col) => col.notNull())
    .addColumn('prerequisites', 'json', (col) => col.notNull())
    .addColumn('created_by', 'varchar(36)', (col) => col.notNull())
    .addColumn('enabled_at', 'timestamp')
    .addColumn('disabled_at', 'timestamp')
    .addColumn('expires_at', 'timestamp')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('feature_flags')
    .addForeignKeyConstraint('fk_feature_flags_owner', ['owner_id'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('feature_flags')
    .addForeignKeyConstraint('fk_feature_flags_created_by', ['created_by'], 'users', ['id'])
    .onDelete('restrict')
    .execute();

  await db.schema
    .alterTable('feature_flags')
    .addForeignKeyConstraint(
      'fk_feature_flags_organization',
      ['organization_id'],
      'organizations',
      ['id'],
    )
    .onDelete('cascade')
    .execute();

  // ============================================
  // CREATE INDEXES
  // ============================================

  // Tasks indexes
  await db.schema.createIndex('idx_tasks_status').on('tasks').column('status').execute();
  await db.schema.createIndex('idx_tasks_type').on('tasks').column('type').execute();
  await db.schema.createIndex('idx_tasks_assignee_id').on('tasks').column('assignee_id').execute();
  await db.schema
    .createIndex('idx_tasks_scheduled_for')
    .on('tasks')
    .column('scheduled_for')
    .execute();
  await db.schema.createIndex('idx_tasks_queue_name').on('tasks').column('queue_name').execute();
  await db.schema
    .createIndex('idx_tasks_correlation_id')
    .on('tasks')
    .column('correlation_id')
    .execute();
  await db.schema
    .createIndex('idx_tasks_organization_id')
    .on('tasks')
    .column('organization_id')
    .execute();

  // Webhooks indexes
  await db.schema
    .createIndex('idx_webhooks_organization_id')
    .on('webhooks')
    .column('organization_id')
    .execute();
  await db.schema
    .createIndex('idx_webhooks_is_active')
    .on('webhooks')
    .column('is_active')
    .execute();

  // Webhook deliveries indexes
  await db.schema
    .createIndex('idx_webhook_deliveries_webhook_id')
    .on('webhook_deliveries')
    .column('webhook_id')
    .execute();
  await db.schema
    .createIndex('idx_webhook_deliveries_status')
    .on('webhook_deliveries')
    .column('status')
    .execute();
  await db.schema
    .createIndex('idx_webhook_deliveries_event')
    .on('webhook_deliveries')
    .columns(['event_type', 'event_id'])
    .execute();
  await db.schema
    .createIndex('idx_webhook_deliveries_created_at')
    .on('webhook_deliveries')
    .column('created_at')
    .execute();

  // Feature flags indexes
  await db.schema.createIndex('idx_feature_flags_key').on('feature_flags').column('key').execute();
  await db.schema
    .createIndex('idx_feature_flags_enabled')
    .on('feature_flags')
    .column('enabled')
    .execute();
  await db.schema
    .createIndex('idx_feature_flags_organization_id')
    .on('feature_flags')
    .column('organization_id')
    .execute();
  await db.schema
    .createIndex('idx_feature_flags_stage')
    .on('feature_flags')
    .column('stage')
    .execute();

  console.log('✅ Created operations tables with indexes');
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop foreign key constraints first
  await db.schema
    .alterTable('feature_flags')
    .dropConstraint('fk_feature_flags_organization')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('feature_flags')
    .dropConstraint('fk_feature_flags_created_by')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('feature_flags')
    .dropConstraint('fk_feature_flags_owner')
    .ifExists()
    .execute();

  await db.schema
    .alterTable('webhook_deliveries')
    .dropConstraint('fk_webhook_deliveries_webhook')
    .ifExists()
    .execute();

  await db.schema
    .alterTable('webhooks')
    .dropConstraint('fk_webhooks_organization')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('webhooks')
    .dropConstraint('fk_webhooks_created_by')
    .ifExists()
    .execute();

  await db.schema.alterTable('tasks').dropConstraint('fk_tasks_organization').ifExists().execute();
  await db.schema.alterTable('tasks').dropConstraint('fk_tasks_created_by').ifExists().execute();
  await db.schema.alterTable('tasks').dropConstraint('fk_tasks_parent').ifExists().execute();
  await db.schema.alterTable('tasks').dropConstraint('fk_tasks_assignee').ifExists().execute();

  // Drop tables
  await db.schema.dropTable('feature_flags').ifExists().execute();
  await db.schema.dropTable('webhook_deliveries').ifExists().execute();
  await db.schema.dropTable('webhooks').ifExists().execute();
  await db.schema.dropTable('tasks').ifExists().execute();

  console.log('✅ Dropped operations tables');
}
