// migrations/001750999230_create_files_table.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ============================================
  // FILES TABLE
  // ============================================
  await db.schema
    .createTable('files')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('filename', 'varchar(255)', (col) => col.notNull())
    .addColumn('original_filename', 'varchar(255)', (col) => col.notNull())
    .addColumn('mime_type', 'varchar(100)', (col) => col.notNull())
    .addColumn('size', 'bigint', (col) => col.notNull())
    .addColumn('storage_provider', sql`enum('local', 's3', 'gcs', 'azure')`, (col) =>
      col.notNull().defaultTo('local'),
    )
    .addColumn('storage_path', 'text', (col) => col.notNull())
    .addColumn('storage_bucket', 'varchar(255)')
    .addColumn('storage_region', 'varchar(50)')
    .addColumn('url', 'text')
    .addColumn('signed_url', 'text')
    .addColumn('signed_url_expires_at', 'timestamp')
    .addColumn('thumbnail_url', 'text')
    .addColumn('checksum', 'varchar(64)')
    .addColumn('encryption_status', sql`enum('none', 'at_rest', 'client_side')`, (col) =>
      col.notNull().defaultTo('none'),
    )
    .addColumn('encryption_key_id', 'varchar(255)')
    .addColumn('metadata', 'json', (col) => col.notNull())
    .addColumn('dimensions', 'json')
    .addColumn('duration', 'integer')
    .addColumn('tags', 'json', (col) => col.notNull())
    .addColumn(
      'purpose',
      sql`enum('avatar', 'attachment', 'document', 'image', 'video', 'audio', 'backup', 'export', 'import', 'temp')`,
      (col) => col.notNull().defaultTo('attachment'),
    )
    .addColumn('access_level', sql`enum('public', 'private', 'restricted', 'internal')`, (col) =>
      col.notNull().defaultTo('private'),
    )
    .addColumn('uploaded_by', 'varchar(36)', (col) => col.notNull())
    .addColumn('organization_id', 'varchar(36)')
    .addColumn('related_entity_type', 'varchar(50)')
    .addColumn('related_entity_id', 'varchar(36)')
    .addColumn('virus_scan_status', sql`enum('pending', 'clean', 'infected', 'error')`, (col) =>
      col.notNull().defaultTo('pending'),
    )
    .addColumn('virus_scan_at', 'timestamp')
    .addColumn('virus_scan_result', 'json')
    .addColumn(
      'processing_status',
      sql`enum('pending', 'processing', 'completed', 'failed')`,
      (col) => col.notNull().defaultTo('pending'),
    )
    .addColumn('processing_error', 'text')
    .addColumn('processed_at', 'timestamp')
    .addColumn('is_deleted', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('deleted_at', 'timestamp')
    .addColumn('deleted_by', 'varchar(36)')
    .addColumn('retention_policy', 'varchar(50)')
    .addColumn('retention_expires_at', 'timestamp')
    .addColumn('download_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('last_accessed_at', 'timestamp')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('files')
    .addForeignKeyConstraint('fk_files_uploaded_by', ['uploaded_by'], 'users', ['id'])
    .onDelete('restrict')
    .execute();

  await db.schema
    .alterTable('files')
    .addForeignKeyConstraint('fk_files_organization', ['organization_id'], 'organizations', ['id'])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('files')
    .addForeignKeyConstraint('fk_files_deleted_by', ['deleted_by'], 'users', ['id'])
    .onDelete('set null')
    .execute();

  // ============================================
  // CREATE INDEXES
  // ============================================

  await db.schema.createIndex('idx_files_uploaded_by').on('files').column('uploaded_by').execute();
  await db.schema
    .createIndex('idx_files_organization_id')
    .on('files')
    .column('organization_id')
    .execute();
  await db.schema.createIndex('idx_files_mime_type').on('files').column('mime_type').execute();
  await db.schema.createIndex('idx_files_purpose').on('files').column('purpose').execute();
  await db.schema
    .createIndex('idx_files_access_level')
    .on('files')
    .column('access_level')
    .execute();
  await db.schema
    .createIndex('idx_files_related_entity')
    .on('files')
    .columns(['related_entity_type', 'related_entity_id'])
    .execute();
  await db.schema.createIndex('idx_files_is_deleted').on('files').column('is_deleted').execute();
  await db.schema.createIndex('idx_files_checksum').on('files').column('checksum').execute();
  await db.schema.createIndex('idx_files_created_at').on('files').column('created_at').execute();

  console.log('✅ Created files table with indexes');
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop foreign key constraints first
  await db.schema.alterTable('files').dropConstraint('fk_files_deleted_by').ifExists().execute();
  await db.schema.alterTable('files').dropConstraint('fk_files_organization').ifExists().execute();
  await db.schema.alterTable('files').dropConstraint('fk_files_uploaded_by').ifExists().execute();

  // Drop table
  await db.schema.dropTable('files').ifExists().execute();

  console.log('✅ Dropped files table');
}
