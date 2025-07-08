// src/infrastructure/database/repositories/base.repository.ts
import { Kysely, Transaction } from 'kysely';
import { Database } from '../types';
import { TransactionManager } from '../transaction/transaction-manager';
import { Inject } from '../../../core/di/decorators/inject.decorator';
import { TOKENS } from '../../../core/di/tokens';

export abstract class BaseRepository {
  // Remove the property declaration - we'll only use the getter
  // protected db: Kysely<Database> | Transaction<Database>;  // DELETE THIS LINE

  constructor(
    private readonly baseDb: Kysely<Database>,
    @Inject(TOKENS.TransactionManager) private transactionManager?: TransactionManager,
  ) {
    // Nothing needed here since we're using a getter
  }

  /**
   * Get the current database connection (transaction-aware)
   * This is the main getter that checks for active transactions
   */
  protected get db(): Kysely<Database> | Transaction<Database> {
    // If we have a transaction manager, use it to get the current transaction
    if (this.transactionManager) {
      return this.transactionManager.getCurrentTransaction();
    }
    // Otherwise, use the base database connection
    return this.baseDb;
  }

  /**
   * Check if we're in a transaction
   */
  protected isInTransaction(): boolean {
    return this.transactionManager?.isInTransaction() || false;
  }

  /**
   * Get the base database connection (ignores transactions)
   * Useful for operations that should not be part of the current transaction
   */
  protected get baseDatabase(): Kysely<Database> {
    return this.baseDb;
  }
}
