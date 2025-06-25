// src/infrastructure/monitoring/health/indicators/database.indicator.ts
import { BaseHealthIndicator } from './base.indicator';
import { HealthCheckData } from '../types';
import { Kysely } from 'kysely';
import { Database } from '../../../database/types';
import { DIContainer } from '../../../../core/di/container';
import { TOKENS } from '../../../../core/di/tokens';

export class DatabaseHealthIndicator extends BaseHealthIndicator {
  name = 'database';

  constructor() {
    super({
      isEssential: true,
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeout: 30000, // 30 seconds
        halfOpenRetries: 1,
      },
      cacheDuration: 10000, // 10 seconds
    });
  }

  protected async performCheck(): Promise<HealthCheckData> {
    try {
      const db = DIContainer.resolve<Kysely<Database>>(TOKENS.Database);
      
      // Perform a simple query to check connectivity
      const result = await db
        .selectFrom('users')
        .select(db.fn.count('id').as('count'))
        .executeTakeFirst();

      // Get connection pool stats if available
      const pool = (db as any).driver?.pool;
      const poolStats = pool ? {
        size: pool.size || 0,
        available: pool.available || 0,
        pending: pool.pending || 0,
        max: pool.max || 0,
      } : undefined;

      return {
        status: 'healthy',
        details: {
          userCount: Number(result?.count || 0),
          pool: poolStats,
        },
      };
    } catch (error) {
      throw new Error(`Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}