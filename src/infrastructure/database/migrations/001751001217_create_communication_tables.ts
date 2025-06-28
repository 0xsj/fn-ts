// migrations/001750999215_create_communication_tables.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ============================================
  // 1. THREADS TABLE
  // ============================================
  await db.schema
    .createTable('threads')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('title', 'varchar(255)')
    .addColumn('type', sql`enum('direct', 'group', 'incident', 'broadcast', 'system')`, (col) =>
      col.notNull().defaultTo('group'),
    )
    .addColumn(
      'purpose',
      sql`enum('general', 'incident_response', 'announcement', 'support', 'task_coordination')`,
      (col) => col.notNull().defaultTo('general'),
    )
    .addColumn('incident_id', 'varchar(36)')
    .addColumn('created_by', 'varchar(36)', (col) => col.notNull())
    .addColumn('organization_id', 'varchar(36)')
    .addColumn('is_private', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('is_archived', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('is_locked', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('is_muted', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('last_message_at', 'timestamp')
    .addColumn('last_message_id', 'varchar(36)')
    .addColumn('message_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('participant_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('settings', 'json', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('threads')
    .addForeignKeyConstraint('fk_threads_created_by', ['created_by'], 'users', ['id'])
    .onDelete('restrict')
    .execute();

  await db.schema
    .alterTable('threads')
    .addForeignKeyConstraint('fk_threads_organization', ['organization_id'], 'organizations', [
      'id',
    ])
    .onDelete('cascade')
    .execute();

  // ============================================
  // 2. THREAD_PARTICIPANTS TABLE
  // ============================================
  await db.schema
    .createTable('thread_participants')
    .addColumn('thread_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('user_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('role', sql`enum('owner', 'admin', 'member', 'observer')`, (col) =>
      col.notNull().defaultTo('member'),
    )
    .addColumn('joined_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('joined_by', 'varchar(36)')
    .addColumn('left_at', 'timestamp')
    .addColumn('removed_by', 'varchar(36)')
    .addColumn('last_read_at', 'timestamp')
    .addColumn('last_read_message_id', 'varchar(36)')
    .addColumn('unread_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('notification_preference', sql`enum('all', 'mentions', 'none')`, (col) =>
      col.notNull().defaultTo('all'),
    )
    .addColumn('is_muted', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('muted_until', 'timestamp')
    .addColumn('can_message', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('can_upload', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('can_invite', 'boolean', (col) => col.notNull().defaultTo(false))
    .addPrimaryKeyConstraint('pk_thread_participants', ['thread_id', 'user_id'])
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('thread_participants')
    .addForeignKeyConstraint('fk_thread_participants_thread', ['thread_id'], 'threads', ['id'])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('thread_participants')
    .addForeignKeyConstraint('fk_thread_participants_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('thread_participants')
    .addForeignKeyConstraint('fk_thread_participants_joined_by', ['joined_by'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('thread_participants')
    .addForeignKeyConstraint('fk_thread_participants_removed_by', ['removed_by'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  // ============================================
  // 3. MESSAGES TABLE
  // ============================================
  await db.schema
    .createTable('messages')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('thread_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('author_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('content_type', sql`enum('text', 'html', 'markdown')`, (col) =>
      col.notNull().defaultTo('text'),
    )
    .addColumn(
      'type',
      sql`enum('user', 'system', 'bot', 'status_change', 'user_joined', 'user_left', 'incident_update')`,
      (col) => col.notNull().defaultTo('user'),
    )
    .addColumn('mentions', 'json', (col) => col.notNull())
    .addColumn('attachments', 'json', (col) => col.notNull())
    .addColumn('location', 'json')
    .addColumn('reply_to_id', 'varchar(36)')
    .addColumn('reply_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('is_edited', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('edited_at', 'timestamp')
    .addColumn('edit_history', 'json', (col) => col.notNull())
    .addColumn('is_deleted', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('deleted_at', 'timestamp')
    .addColumn('deleted_by', 'varchar(36)')
    .addColumn('reactions', 'json', (col) => col.notNull())
    .addColumn('system_metadata', 'json')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('messages')
    .addForeignKeyConstraint('fk_messages_thread', ['thread_id'], 'threads', ['id'])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('messages')
    .addForeignKeyConstraint('fk_messages_author', ['author_id'], 'users', ['id'])
    .onDelete('restrict')
    .execute();

  await db.schema
    .alterTable('messages')
    .addForeignKeyConstraint('fk_messages_reply_to', ['reply_to_id'], 'messages', ['id'])
    .onDelete('set null')
    .execute();

  await db.schema
    .alterTable('messages')
    .addForeignKeyConstraint('fk_messages_deleted_by', ['deleted_by'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  // ============================================
  // 4. MESSAGE_READ_RECEIPTS TABLE
  // ============================================
  await db.schema
    .createTable('message_read_receipts')
    .addColumn('message_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('user_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('read_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addPrimaryKeyConstraint('pk_message_read_receipts', ['message_id', 'user_id'])
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('message_read_receipts')
    .addForeignKeyConstraint('fk_message_read_receipts_message', ['message_id'], 'messages', ['id'])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('message_read_receipts')
    .addForeignKeyConstraint('fk_message_read_receipts_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  // ============================================
  // 5. PRESENCE TABLE
  // ============================================
  await db.schema
    .createTable('presence')
    .addColumn('user_id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('status', sql`enum('online', 'away', 'busy', 'offline')`, (col) =>
      col.notNull().defaultTo('offline'),
    )
    .addColumn('status_message', 'varchar(255)')
    .addColumn('last_seen_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn('is_typing_in_thread', 'varchar(36)')
    .addColumn('typing_started_at', 'timestamp')
    .addColumn('active_device', 'varchar(255)')
    .addColumn('active_devices', 'json', (col) => col.notNull())
    .addColumn('location', 'json')
    .addColumn('timezone', 'varchar(50)')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('presence')
    .addForeignKeyConstraint('fk_presence_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('presence')
    .addForeignKeyConstraint('fk_presence_typing_thread', ['is_typing_in_thread'], 'threads', [
      'id',
    ])
    .onDelete('set null')
    .execute();

  // ============================================
  // CREATE INDEXES
  // ============================================

  // Threads indexes
  await db.schema
    .createIndex('idx_threads_organization_id')
    .on('threads')
    .column('organization_id')
    .execute();
  await db.schema
    .createIndex('idx_threads_incident_id')
    .on('threads')
    .column('incident_id')
    .execute();
  await db.schema.createIndex('idx_threads_type').on('threads').column('type').execute();
  await db.schema
    .createIndex('idx_threads_is_archived')
    .on('threads')
    .column('is_archived')
    .execute();
  await db.schema
    .createIndex('idx_threads_last_message_at')
    .on('threads')
    .column('last_message_at')
    .execute();

  // Thread participants indexes
  await db.schema
    .createIndex('idx_thread_participants_user_id')
    .on('thread_participants')
    .column('user_id')
    .execute();
  await db.schema
    .createIndex('idx_thread_participants_thread_id')
    .on('thread_participants')
    .column('thread_id')
    .execute();

  // Messages indexes
  await db.schema
    .createIndex('idx_messages_thread_id')
    .on('messages')
    .column('thread_id')
    .execute();
  await db.schema
    .createIndex('idx_messages_author_id')
    .on('messages')
    .column('author_id')
    .execute();
  await db.schema
    .createIndex('idx_messages_created_at')
    .on('messages')
    .columns(['thread_id', 'created_at'])
    .execute();
  await db.schema
    .createIndex('idx_messages_reply_to_id')
    .on('messages')
    .column('reply_to_id')
    .execute();

  // Message read receipts indexes
  await db.schema
    .createIndex('idx_message_read_receipts_user_id')
    .on('message_read_receipts')
    .column('user_id')
    .execute();

  // Presence indexes
  await db.schema.createIndex('idx_presence_status').on('presence').column('status').execute();
  await db.schema
    .createIndex('idx_presence_last_seen_at')
    .on('presence')
    .column('last_seen_at')
    .execute();

  console.log('✅ Created communication tables with indexes');
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop foreign key constraints first
  await db.schema
    .alterTable('presence')
    .dropConstraint('fk_presence_typing_thread')
    .ifExists()
    .execute();
  await db.schema.alterTable('presence').dropConstraint('fk_presence_user').ifExists().execute();

  await db.schema
    .alterTable('message_read_receipts')
    .dropConstraint('fk_message_read_receipts_user')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('message_read_receipts')
    .dropConstraint('fk_message_read_receipts_message')
    .ifExists()
    .execute();

  await db.schema
    .alterTable('messages')
    .dropConstraint('fk_messages_deleted_by')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('messages')
    .dropConstraint('fk_messages_reply_to')
    .ifExists()
    .execute();
  await db.schema.alterTable('messages').dropConstraint('fk_messages_author').ifExists().execute();
  await db.schema.alterTable('messages').dropConstraint('fk_messages_thread').ifExists().execute();

  await db.schema
    .alterTable('thread_participants')
    .dropConstraint('fk_thread_participants_removed_by')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('thread_participants')
    .dropConstraint('fk_thread_participants_joined_by')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('thread_participants')
    .dropConstraint('fk_thread_participants_user')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('thread_participants')
    .dropConstraint('fk_thread_participants_thread')
    .ifExists()
    .execute();

  await db.schema
    .alterTable('threads')
    .dropConstraint('fk_threads_organization')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('threads')
    .dropConstraint('fk_threads_created_by')
    .ifExists()
    .execute();

  // Drop tables
  await db.schema.dropTable('presence').ifExists().execute();
  await db.schema.dropTable('message_read_receipts').ifExists().execute();
  await db.schema.dropTable('messages').ifExists().execute();
  await db.schema.dropTable('thread_participants').ifExists().execute();
  await db.schema.dropTable('threads').ifExists().execute();

  console.log('✅ Dropped communication tables');
}
