// migrations/001750999205_create_organizations_table.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('organizations')
    .addColumn('id', 'varchar(36)', (col) => col.primaryKey())

    // Basic information
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('slug', 'varchar(100)', (col) => col.notNull().unique())
    .addColumn('display_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text')

    // Type and status with ENUM
    .addColumn('type', sql`enum('free', 'pro', 'enterprise', 'government', 'non_profit')`, (col) =>
      col.notNull().defaultTo('free'),
    )
    .addColumn('status', sql`enum('active', 'suspended', 'cancelled', 'trial')`, (col) =>
      col.notNull().defaultTo('active'),
    )

    // Contact information (will FK to users later)
    .addColumn('primary_contact_id', 'varchar(36)')
    .addColumn('billing_contact_id', 'varchar(36)')
    .addColumn('technical_contact_id', 'varchar(36)')

    // Basic contact info
    .addColumn('email', 'varchar(255)', (col) => col.notNull())
    .addColumn('phone', 'varchar(50)')
    .addColumn('website', 'varchar(255)')

    // JSON columns WITHOUT defaults
    .addColumn('address', 'json', (col) => col.notNull())
    .addColumn('billing', 'json', (col) => col.notNull())
    .addColumn('settings', 'json', (col) => col.notNull())

    // Ownership - will FK to users later
    .addColumn('owner_id', 'varchar(36)', (col) => col.notNull())
    .addColumn('created_by', 'varchar(36)', (col) => col.notNull())

    // Soft delete fields
    .addColumn('deleted_at', 'timestamp')
    .addColumn('deleted_by', 'varchar(36)')
    .addColumn('deletion_scheduled_at', 'timestamp')

    // Statistics
    .addColumn('stats', 'json', (col) => col.notNull())

    // Timestamps
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    )
    .execute();

  // Create indexes
  await db.schema
    .createIndex('idx_organizations_slug')
    .on('organizations')
    .column('slug')
    .execute();

  await db.schema
    .createIndex('idx_organizations_status')
    .on('organizations')
    .column('status')
    .execute();

  await db.schema
    .createIndex('idx_organizations_type')
    .on('organizations')
    .column('type')
    .execute();

  await db.schema
    .createIndex('idx_organizations_owner_id')
    .on('organizations')
    .column('owner_id')
    .execute();

  await db.schema
    .createIndex('idx_organizations_deleted_at')
    .on('organizations')
    .column('deleted_at')
    .execute();

  await db.schema
    .createIndex('idx_organizations_active')
    .on('organizations')
    .columns(['status', 'deleted_at'])
    .execute();

  console.log('✅ Created organizations table with indexes');
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('organizations').ifExists().execute();
  console.log('✅ Dropped organizations table');
}
