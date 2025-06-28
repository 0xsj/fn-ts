// migrations/001750999221_create_notification_tables.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ============================================
  // 1. NOTIFICATION_TEMPLATES TABLE
  // ============================================
  await db.schema
    .createTable('notification_templates')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('slug', 'varchar(100)', (col) => col.notNull().unique())
    .addColumn('description', 'text')
    .addColumn('channel', sql`enum('email', 'sms', 'push', 'in_app', 'webhook')`, (col) =>
      col.notNull(),
    )
    .addColumn('category', sql`enum('transactional', 'marketing', 'alert', 'system')`, (col) =>
      col.notNull().defaultTo('transactional'),
    )
    .addColumn('subject_template', 'text')
    .addColumn('content_template', 'text', (col) => col.notNull())
    .addColumn('content_html_template', 'text')
    .addColumn('engine', sql`enum('handlebars', 'liquid', 'mustache', 'plain')`, (col) =>
      col.notNull().defaultTo('handlebars'),
    )
    .addColumn('variables', 'json', (col) => col.notNull())
    .addColumn('locale', 'varchar(10)', (col) => col.notNull().defaultTo('en'))
    .addColumn('parent_template_id', 'varchar(36)')
    .addColumn('channel_defaults', 'json', (col) => col.notNull())
    .addColumn('version', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('published_at', 'timestamp')
    .addColumn('archived_at', 'timestamp')
    .addColumn('usage_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('last_used_at', 'timestamp')
    .addColumn('created_by', 'varchar(36)', (col) => col.notNull())
    .addColumn('organization_id', 'varchar(36)')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('notification_templates')
    .addForeignKeyConstraint(
      'fk_notification_templates_parent',
      ['parent_template_id'],
      'notification_templates',
      ['id'],
    )
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('notification_templates')
    .addForeignKeyConstraint('fk_notification_templates_created_by', ['created_by'], 'users', [
      'id',
    ])
    .onDelete('restrict')
    .execute();

  await db.schema
    .alterTable('notification_templates')
    .addForeignKeyConstraint(
      'fk_notification_templates_organization',
      ['organization_id'],
      'organizations',
      ['id'],
    )
    .onDelete('cascade')
    .execute();

  // ============================================
  // 2. NOTIFICATIONS TABLE
  // ============================================
  await db.schema
    .createTable('notifications')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('recipient_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('recipient_type', sql`enum('user', 'group', 'role', 'external')`, (col) =>
      col.notNull().defaultTo('user'),
    )
    .addColumn('recipient_email', 'varchar(255)')
    .addColumn('recipient_phone', 'varchar(50)')
    .addColumn('channel', sql`enum('email', 'sms', 'push', 'in_app', 'webhook')`, (col) =>
      col.notNull(),
    )
    .addColumn('priority', sql`enum('critical', 'high', 'normal', 'low')`, (col) =>
      col.notNull().defaultTo('normal'),
    )
    .addColumn(
      'status',
      sql`enum('pending', 'queued', 'sending', 'sent', 'delivered', 'failed', 'bounced', 'cancelled')`,
      (col) => col.notNull().defaultTo('pending'),
    )
    .addColumn('incident_id', 'varchar(36)')
    .addColumn('thread_id', 'varchar(36)')
    .addColumn('organization_id', 'varchar(36)')
    .addColumn('subject', 'text')
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('content_html', 'text')
    .addColumn('template_id', 'varchar(36)')
    .addColumn('template_version', 'integer')
    .addColumn('template_data', 'json', (col) => col.notNull())
    .addColumn('locale', 'varchar(10)', (col) => col.notNull().defaultTo('en'))
    .addColumn('scheduled_for', 'timestamp')
    .addColumn('expires_at', 'timestamp')
    .addColumn('queued_at', 'timestamp')
    .addColumn('sent_at', 'timestamp')
    .addColumn('delivered_at', 'timestamp')
    .addColumn('failed_at', 'timestamp')
    .addColumn('cancelled_at', 'timestamp')
    .addColumn('failure_reason', 'text')
    .addColumn('retry_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('max_retries', 'integer', (col) => col.notNull().defaultTo(3))
    .addColumn('next_retry_at', 'timestamp')
    .addColumn('provider', 'varchar(50)')
    .addColumn('provider_message_id', 'varchar(255)')
    .addColumn('provider_response', 'json')
    .addColumn('provider_cost', 'integer')
    .addColumn('opened_at', 'timestamp')
    .addColumn('clicked_at', 'timestamp')
    .addColumn('unsubscribed_at', 'timestamp')
    .addColumn('marked_as_spam_at', 'timestamp')
    .addColumn('channel_data', 'json', (col) => col.notNull())
    .addColumn('batch_id', 'varchar(36)')
    .addColumn('group_key', 'varchar(100)')
    .addColumn('tags', 'json', (col) => col.notNull())
    .addColumn('requires_consent', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('consent_given', 'boolean')
    .addColumn('consent_given_at', 'timestamp')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('notifications')
    .addForeignKeyConstraint(
      'fk_notifications_template',
      ['template_id'],
      'notification_templates',
      ['id'],
    )
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('notifications')
    .addForeignKeyConstraint('fk_notifications_thread', ['thread_id'], 'threads', ['id'])
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('notifications')
    .addForeignKeyConstraint(
      'fk_notifications_organization',
      ['organization_id'],
      'organizations',
      ['id'],
    )
    .onDelete('cascade')
    .execute();

  // ============================================
  // 3. NOTIFICATION_SUBSCRIPTIONS TABLE
  // ============================================
  await db.schema
    .createTable('notification_subscriptions')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('user_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('channels', 'json', (col) => col.notNull())
    .addColumn('categories', 'json', (col) => col.notNull())
    .addColumn('specific_notifications', 'json', (col) => col.notNull())
    .addColumn('quiet_hours', 'json', (col) => col.notNull())
    .addColumn('frequency_settings', 'json', (col) => col.notNull())
    .addColumn('delivery_preferences', 'json', (col) => col.notNull())
    .addColumn('is_all_disabled', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('disabled_until', 'timestamp')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('notification_subscriptions')
    .addForeignKeyConstraint('fk_notification_subscriptions_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  // ============================================
  // CREATE INDEXES
  // ============================================

  // Notification templates indexes
  await db.schema
    .createIndex('idx_notification_templates_slug')
    .on('notification_templates')
    .column('slug')
    .execute();
  await db.schema
    .createIndex('idx_notification_templates_channel')
    .on('notification_templates')
    .column('channel')
    .execute();
  await db.schema
    .createIndex('idx_notification_templates_category')
    .on('notification_templates')
    .column('category')
    .execute();
  await db.schema
    .createIndex('idx_notification_templates_organization_id')
    .on('notification_templates')
    .column('organization_id')
    .execute();
  await db.schema
    .createIndex('idx_notification_templates_is_active')
    .on('notification_templates')
    .column('is_active')
    .execute();

  // Notifications indexes
  await db.schema
    .createIndex('idx_notifications_recipient')
    .on('notifications')
    .columns(['recipient_id', 'recipient_type'])
    .execute();
  await db.schema
    .createIndex('idx_notifications_channel')
    .on('notifications')
    .column('channel')
    .execute();
  await db.schema
    .createIndex('idx_notifications_status')
    .on('notifications')
    .column('status')
    .execute();
  await db.schema
    .createIndex('idx_notifications_priority')
    .on('notifications')
    .column('priority')
    .execute();
  await db.schema
    .createIndex('idx_notifications_scheduled_for')
    .on('notifications')
    .column('scheduled_for')
    .execute();
  await db.schema
    .createIndex('idx_notifications_batch_id')
    .on('notifications')
    .column('batch_id')
    .execute();
  await db.schema
    .createIndex('idx_notifications_group_key')
    .on('notifications')
    .column('group_key')
    .execute();
  await db.schema
    .createIndex('idx_notifications_created_at')
    .on('notifications')
    .column('created_at')
    .execute();
  await db.schema
    .createIndex('idx_notifications_organization_id')
    .on('notifications')
    .column('organization_id')
    .execute();

  // Notification subscriptions indexes
  await db.schema
    .createIndex('idx_notification_subscriptions_user_id')
    .on('notification_subscriptions')
    .column('user_id')
    .execute();

  console.log('✅ Created notification tables with indexes');
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop foreign key constraints first
  await db.schema
    .alterTable('notification_subscriptions')
    .dropConstraint('fk_notification_subscriptions_user')
    .ifExists()
    .execute();

  await db.schema
    .alterTable('notifications')
    .dropConstraint('fk_notifications_organization')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('notifications')
    .dropConstraint('fk_notifications_thread')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('notifications')
    .dropConstraint('fk_notifications_template')
    .ifExists()
    .execute();

  await db.schema
    .alterTable('notification_templates')
    .dropConstraint('fk_notification_templates_organization')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('notification_templates')
    .dropConstraint('fk_notification_templates_created_by')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('notification_templates')
    .dropConstraint('fk_notification_templates_parent')
    .ifExists()
    .execute();

  // Drop tables
  await db.schema.dropTable('notification_subscriptions').ifExists().execute();
  await db.schema.dropTable('notifications').ifExists().execute();
  await db.schema.dropTable('notification_templates').ifExists().execute();

  console.log('✅ Dropped notification tables');
}
