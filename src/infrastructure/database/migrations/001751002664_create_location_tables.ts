// migrations/001750999224_create_location_tables.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ============================================
  // 1. LOCATIONS TABLE
  // ============================================
  await db.schema
    .createTable('locations')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn(
      'type',
      sql`enum('home', 'work', 'site', 'temporary', 'landmark', 'custom')`,
      (col) => col.notNull().defaultTo('custom'),
    )
    .addColumn('latitude', sql`double`, (col) => col.notNull())
    .addColumn('longitude', sql`double`, (col) => col.notNull())
    .addColumn('altitude', sql`double`)
    .addColumn('accuracy', sql`double`)
    .addColumn('address', 'json', (col) => col.notNull())
    .addColumn('radius', 'integer', (col) => col.notNull().defaultTo(100))
    .addColumn('is_primary', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('metadata', 'json', (col) => col.notNull())
    .addColumn('user_id', 'varchar(36)')
    .addColumn('organization_id', 'varchar(36)')
    .addColumn('created_by', 'varchar(36)', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('locations')
    .addForeignKeyConstraint('fk_locations_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('locations')
    .addForeignKeyConstraint('fk_locations_organization', ['organization_id'], 'organizations', [
      'id',
    ])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('locations')
    .addForeignKeyConstraint('fk_locations_created_by', ['created_by'], 'users', ['id'])
    .onDelete('restrict')
    .execute();

  // ============================================
  // 2. LOCATION_HISTORY TABLE
  // ============================================
  await db.schema
    .createTable('location_history')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('user_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('latitude', sql`double`, (col) => col.notNull())
    .addColumn('longitude', sql`double`, (col) => col.notNull())
    .addColumn('altitude', sql`double`)
    .addColumn('accuracy', sql`double`)
    .addColumn('speed', sql`double`)
    .addColumn('heading', sql`double`)
    .addColumn(
      'activity_type',
      sql`enum('stationary', 'walking', 'running', 'cycling', 'automotive', 'unknown')`,
    )
    .addColumn('battery_level', 'integer')
    .addColumn('is_charging', 'boolean')
    .addColumn('is_moving', 'boolean')
    .addColumn('device_id', 'varchar(255)')
    .addColumn('provider', 'varchar(50)')
    .addColumn('recorded_at', 'timestamp', (col) => col.notNull())
    .addColumn('received_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('location_history')
    .addForeignKeyConstraint('fk_location_history_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  // ============================================
  // 3. GEOFENCES TABLE
  // ============================================
  await db.schema
    .createTable('geofences')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('type', sql`enum('circle', 'polygon', 'rectangle')`, (col) =>
      col.notNull().defaultTo('circle'),
    )
    .addColumn('geometry', 'json', (col) => col.notNull())
    .addColumn('center_latitude', sql`double`)
    .addColumn('center_longitude', sql`double`)
    .addColumn('radius', 'integer')
    .addColumn('trigger_on_enter', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('trigger_on_exit', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('trigger_on_dwell', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('dwell_time_seconds', 'integer', (col) => col.notNull().defaultTo(300))
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('schedule', 'json')
    .addColumn('notification_settings', 'json', (col) => col.notNull())
    .addColumn('action_settings', 'json', (col) => col.notNull())
    .addColumn('metadata', 'json', (col) => col.notNull())
    .addColumn('location_id', 'varchar(36)')
    .addColumn('user_id', 'varchar(36)')
    .addColumn('organization_id', 'varchar(36)')
    .addColumn('created_by', 'varchar(36)', (col) => col.notNull())
    .addColumn('expires_at', 'timestamp')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Add foreign keys
  await db.schema
    .alterTable('geofences')
    .addForeignKeyConstraint('fk_geofences_location', ['location_id'], 'locations', ['id'])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('geofences')
    .addForeignKeyConstraint('fk_geofences_user', ['user_id'], 'users', ['id'])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('geofences')
    .addForeignKeyConstraint('fk_geofences_organization', ['organization_id'], 'organizations', [
      'id',
    ])
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('geofences')
    .addForeignKeyConstraint('fk_geofences_created_by', ['created_by'], 'users', ['id'])
    .onDelete('restrict')
    .execute();

  // ============================================
  // CREATE INDEXES
  // ============================================

  // Locations indexes
  await db.schema.createIndex('idx_locations_user_id').on('locations').column('user_id').execute();
  await db.schema
    .createIndex('idx_locations_organization_id')
    .on('locations')
    .column('organization_id')
    .execute();
  await db.schema.createIndex('idx_locations_type').on('locations').column('type').execute();
  await db.schema
    .createIndex('idx_locations_is_active')
    .on('locations')
    .column('is_active')
    .execute();
  await db.schema
    .createIndex('idx_locations_coordinates')
    .on('locations')
    .columns(['latitude', 'longitude'])
    .execute();

  // Location history indexes
  await db.schema
    .createIndex('idx_location_history_user_id')
    .on('location_history')
    .column('user_id')
    .execute();
  await db.schema
    .createIndex('idx_location_history_recorded_at')
    .on('location_history')
    .column('recorded_at')
    .execute();
  await db.schema
    .createIndex('idx_location_history_user_time')
    .on('location_history')
    .columns(['user_id', 'recorded_at'])
    .execute();

  // Geofences indexes
  await db.schema.createIndex('idx_geofences_user_id').on('geofences').column('user_id').execute();
  await db.schema
    .createIndex('idx_geofences_organization_id')
    .on('geofences')
    .column('organization_id')
    .execute();
  await db.schema
    .createIndex('idx_geofences_location_id')
    .on('geofences')
    .column('location_id')
    .execute();
  await db.schema
    .createIndex('idx_geofences_is_active')
    .on('geofences')
    .column('is_active')
    .execute();
  await db.schema.createIndex('idx_geofences_type').on('geofences').column('type').execute();

  console.log('✅ Created location tables with indexes');
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop foreign key constraints first
  await db.schema
    .alterTable('geofences')
    .dropConstraint('fk_geofences_created_by')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('geofences')
    .dropConstraint('fk_geofences_organization')
    .ifExists()
    .execute();
  await db.schema.alterTable('geofences').dropConstraint('fk_geofences_user').ifExists().execute();
  await db.schema
    .alterTable('geofences')
    .dropConstraint('fk_geofences_location')
    .ifExists()
    .execute();

  await db.schema
    .alterTable('location_history')
    .dropConstraint('fk_location_history_user')
    .ifExists()
    .execute();

  await db.schema
    .alterTable('locations')
    .dropConstraint('fk_locations_created_by')
    .ifExists()
    .execute();
  await db.schema
    .alterTable('locations')
    .dropConstraint('fk_locations_organization')
    .ifExists()
    .execute();
  await db.schema.alterTable('locations').dropConstraint('fk_locations_user').ifExists().execute();

  // Drop tables
  await db.schema.dropTable('geofences').ifExists().execute();
  await db.schema.dropTable('location_history').ifExists().execute();
  await db.schema.dropTable('locations').ifExists().execute();

  console.log('✅ Dropped location tables');
}
