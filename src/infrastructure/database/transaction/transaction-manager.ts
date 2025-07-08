// src/infrastructure/database/transaction/transaction-manager.ts
import { Kysely, Transaction, sql } from 'kysely';
import { Database } from '../types';
import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../shared/utils/logger';
import { Injectable } from '../../../core/di/decorators/injectable.decorator';

export interface TransactionContext {
  id: string;
  transaction: Transaction<Database>;
  startTime: number;
  isolationLevel?: IsolationLevel;
  readOnly?: boolean;
}

export type IsolationLevel =
  | 'read uncommitted'
  | 'read committed'
  | 'repeatable read'
  | 'serializable';

@Injectable()
export class TransactionManager {
  private static asyncLocalStorage = new AsyncLocalStorage<TransactionContext>();

  constructor(private db: Kysely<Database>) {}

  /**
   * Get the current transaction from async context, or the main database connection
   */
  getCurrentTransaction(): Transaction<Database> | Kysely<Database> {
    const context = TransactionManager.asyncLocalStorage.getStore();
    return context?.transaction || this.db;
  }

  /**
   * Check if we're currently in a transaction
   */
  isInTransaction(): boolean {
    return !!TransactionManager.asyncLocalStorage.getStore();
  }

  /**
   * Get the current transaction context
   */
  getTransactionContext(): TransactionContext | undefined {
    return TransactionManager.asyncLocalStorage.getStore();
  }

  /**
   * Execute a function within a transaction
   */
  async runInTransaction<T>(
    fn: (trx: Transaction<Database>) => Promise<T>,
    options?: {
      isolationLevel?: IsolationLevel;
      readOnly?: boolean;
      timeout?: number;
    },
  ): Promise<T> {
    // If already in a transaction, use the existing one (nested transaction support)
    const existingContext = this.getTransactionContext();
    if (existingContext) {
      logger.debug('Using existing transaction', {
        transactionId: existingContext.id,
        nested: true,
      });
      return fn(existingContext.transaction);
    }

    const transactionId = uuidv4();
    const startTime = Date.now();

    logger.debug('Starting new transaction', {
      transactionId,
      isolationLevel: options?.isolationLevel,
      readOnly: options?.readOnly,
    });

    try {
      const result = await this.db.transaction().execute(async (trx) => {
        // Set transaction options if provided
        if (options?.isolationLevel) {
          // Kysely doesn't support SET TRANSACTION directly, but you can use raw SQL
          const isolationQuery = `SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel.toUpperCase()}`;
          await sql.raw(isolationQuery).execute(trx);
        }

        if (options?.readOnly) {
          await sql.raw('SET TRANSACTION READ ONLY').execute(trx);
        }

        const context: TransactionContext = {
          id: transactionId,
          transaction: trx,
          startTime,
          isolationLevel: options?.isolationLevel,
          readOnly: options?.readOnly,
        };

        // Run the function with the transaction context
        return TransactionManager.asyncLocalStorage.run(context, () => fn(trx));
      });

      const duration = Date.now() - startTime;
      logger.debug('Transaction completed successfully', {
        transactionId,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Transaction failed', {
        transactionId,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Execute raw SQL within current transaction context
   */
  async executeRaw<T = any>(query: string): Promise<T> {
    const db = this.getCurrentTransaction();
    const result = await sql.raw(query).execute(db);
    return result as T;
  }

  /**
   * Execute parameterized SQL within current transaction context
   * Note: Kysely recommends using sql template literals instead
   */
  async executeParameterized<T = any>(query: string, params: Record<string, any>): Promise<T> {
    const db = this.getCurrentTransaction();

    // Build query with parameters using Kysely's sql template
    let sqlQuery = sql.raw(query);

    // This is a simplified version - in practice, you'd want to use
    // sql template literals for safety
    for (const [key, value] of Object.entries(params)) {
      const placeholder = `:${key}`;
      if (query.includes(placeholder)) {
        query = query.replace(new RegExp(placeholder, 'g'), '?');
      }
    }

    // For parameterized queries, it's better to use sql template literals
    const result = await sql.raw(query).execute(db);
    return result as T;
  }
}
