import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // TODO: Implement migration
  // Examples:
  // Create table
  // await db.schema
  //   .createTable('table_name')
  //   .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
  //   .addColumn('created_at', 'timestamp', (col) =>
  //     col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
  //   )
  //   .execute();
  // Add column
  // await db.schema
  //   .alterTable('table_name')
  //   .addColumn('column_name', 'varchar(255)')
  //   .execute();
  // Create index
  // await db.schema
  //   .createIndex('idx_table_column')
  //   .on('table_name')
  //   .column('column_name')
  //   .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // TODO: Implement rollback
  // Examples:
  // Drop table
  // await db.schema.dropTable('table_name').execute();
  // Drop column
  // await db.schema
  //   .alterTable('table_name')
  //   .dropColumn('column_name')
  //   .execute();
  // Drop index
  // await db.schema.dropIndex('idx_table_column').execute();
}
