// src/infrastructure/database/transaction/transaction-manager.ts (simplified version)
import { Kysely, Transaction } from 'kysely';
import { Database } from '../types';
import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../shared/utils/logger';
import { Injectable } from '../../../core/di/decorators/injectable.decorator';
import { TransactionHelper } from './transaction-helper';

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

  getCurrentTransaction(): Transaction<Database> | Kysely<Database> {
    const context = TransactionManager.asyncLocalStorage.getStore();
    return context?.transaction || this.db;
  }

  isInTransaction(): boolean {
    return !!TransactionManager.asyncLocalStorage.getStore();
  }

  getTransactionContext(): TransactionContext | undefined {
    return TransactionManager.asyncLocalStorage.getStore();
  }

  async runInTransaction<T>(
    fn: (trx: Transaction<Database>) => Promise<T>,
    options?: {
      isolationLevel?: IsolationLevel;
      readOnly?: boolean;
      timeout?: number;
    },
  ): Promise<T> {
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
        // Use helper methods for transaction options
        if (options?.isolationLevel) {
          await TransactionHelper.setIsolationLevel(trx, options.isolationLevel);
        }

        if (options?.readOnly) {
          await TransactionHelper.setReadOnly(trx);
        }

        const context: TransactionContext = {
          id: transactionId,
          transaction: trx,
          startTime,
          isolationLevel: options?.isolationLevel,
          readOnly: options?.readOnly,
        };

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
}
