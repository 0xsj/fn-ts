// src/scripts/test-simple.ts
import 'dotenv/config';
import { Kysely, MysqlDialect, sql } from 'kysely';
import { createPool } from 'mysql2';
import { config } from '../core/config';

async function testSimple() {
  const pool = createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.username,
    password: config.database.password,
    database: config.database.database,
  });

  const db = new Kysely<any>({
    dialect: new MysqlDialect({ pool }),
  });

  try {
    // Just try to create a simple table
    await db.schema
      .createTable('test_org')
      .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
      .addColumn('data', 'json', (col) => col.defaultTo('{}'))
      .execute();

    console.log('✅ Table created successfully');

    // Clean up
    await db.schema.dropTable('test_org').execute();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.destroy();
  }
}

testSimple();
