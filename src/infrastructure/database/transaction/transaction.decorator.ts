// src/infrastructure/database/transaction/transactional.decorator.ts
import { DIContainer } from '../../../core/di/container';
import { TransactionManager, IsolationLevel } from './transaction-manager';
import { TOKENS } from '../../../core/di/tokens';
import { logger } from '../../../shared/utils/logger';

export interface TransactionalOptions {
  isolationLevel?: IsolationLevel;
  readOnly?: boolean;
  timeout?: number;
  propagation?: 'required' | 'requires_new' | 'supports' | 'mandatory' | 'not_supported' | 'never';
}

/**
 * Decorator to wrap a method in a database transaction
 *
 * @example
 * ```typescript
 * @Transactional()
 * async createUserWithProfile(userData: CreateUserInput): Promise<User> {
 *   // All database operations in this method will be in a transaction
 *   const user = await this.userRepo.create(userData);
 *   await this.profileRepo.create({ userId: user.id });
 *   return user;
 * }
 * ```
 */
export function Transactional(options: TransactionalOptions = {}): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const methodName = `${target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (...args: any[]) {
      // Get transaction manager
      let transactionManager: TransactionManager;
      try {
        transactionManager = DIContainer.resolve<TransactionManager>(TOKENS.TransactionManager);
      } catch (error) {
        logger.error(`TransactionManager not available for ${methodName}`, { error });
        // Fall back to running without transaction
        return originalMethod.apply(this, args);
      }

      const propagation = options.propagation || 'required';
      const isInTransaction = transactionManager.isInTransaction();

      // Handle different propagation strategies
      switch (propagation) {
        case 'never':
          if (isInTransaction) {
            throw new Error(`Method ${methodName} must not be called within a transaction`);
          }
          return originalMethod.apply(this, args);

        case 'not_supported':
          // Execute outside of any transaction
          return originalMethod.apply(this, args);

        case 'mandatory':
          if (!isInTransaction) {
            throw new Error(`Method ${methodName} must be called within an existing transaction`);
          }
          return originalMethod.apply(this, args);

        case 'supports':
          // Execute with or without transaction
          return originalMethod.apply(this, args);

        case 'requires_new':
          // Always create a new transaction
          return transactionManager.runInTransaction(
            async () => originalMethod.apply(this, args),
            options,
          );

        case 'required':
        default:
          // Use existing transaction or create new one
          if (isInTransaction) {
            return originalMethod.apply(this, args);
          }
          return transactionManager.runInTransaction(
            async () => originalMethod.apply(this, args),
            options,
          );
      }
    };

    return descriptor;
  };
}

/**
 * Convenience decorators for common transaction patterns
 */
export const ReadOnlyTransaction = (options?: Omit<TransactionalOptions, 'readOnly'>) =>
  Transactional({ ...options, readOnly: true });

export const IsolatedTransaction = (options?: Omit<TransactionalOptions, 'isolationLevel'>) =>
  Transactional({ ...options, isolationLevel: 'serializable' });

export const NewTransaction = (options?: Omit<TransactionalOptions, 'propagation'>) =>
  Transactional({ ...options, propagation: 'requires_new' });
