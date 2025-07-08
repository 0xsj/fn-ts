// src/infrastructure/database/transaction/transaction-helper.ts
import { sql, Kysely, Transaction } from 'kysely';
import { Database } from '../types';
import { IsolationLevel } from './transaction-manager';

/**
 * Helper functions for raw SQL in Kysely
 */
export class TransactionHelper {
  /**
   * Set transaction isolation level
   */
  static async setIsolationLevel(trx: Transaction<Database>, level: IsolationLevel): Promise<void> {
    const levelMap = {
      'read uncommitted': 'READ UNCOMMITTED',
      'read committed': 'READ COMMITTED',
      'repeatable read': 'REPEATABLE READ',
      serializable: 'SERIALIZABLE',
    };

    await sql.raw(`SET TRANSACTION ISOLATION LEVEL ${levelMap[level]}`).execute(trx);
  }

  /**
   * Set transaction as read-only
   */
  static async setReadOnly(trx: Transaction<Database>): Promise<void> {
    await sql.raw('SET TRANSACTION READ ONLY').execute(trx);
  }

  /**
   * Execute VACUUM ANALYZE (PostgreSQL)
   */
  static async vacuumAnalyze(
    db: Kysely<Database> | Transaction<Database>,
    tableName: string,
  ): Promise<void> {
    // Use template literal for safety
    await sql`VACUUM ANALYZE ${sql.table(tableName)}`.execute(db);
  }

  /**
   * Execute OPTIMIZE TABLE (MySQL)
   */
  static async optimizeTable(
    db: Kysely<Database> | Transaction<Database>,
    tableName: string,
  ): Promise<void> {
    // For MySQL
    await sql`OPTIMIZE TABLE ${sql.table(tableName)}`.execute(db);
  }

  /**
   * Refresh materialized view
   */
  static async refreshMaterializedView(
    db: Kysely<Database> | Transaction<Database>,
    viewName: string,
    concurrently: boolean = true,
  ): Promise<void> {
    if (concurrently) {
      await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY ${sql.table(viewName)}`.execute(db);
    } else {
      await sql`REFRESH MATERIALIZED VIEW ${sql.table(viewName)}`.execute(db);
    }
  }
}
