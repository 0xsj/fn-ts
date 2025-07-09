// src/infrastructure/scheduler/jobs/cleanup.job.ts
import { Injectable, Inject } from '../../../core/di/decorators';
import { Cron } from '../decorators/cron.decorator';
import { TOKENS } from '../../../core/di/tokens';
import { ILogger } from '../../../shared/utils';
import { Kysely } from 'kysely';
import { Database } from '../../database/types';

@Injectable()
export class CleanupJob {
  constructor(
    @Inject(TOKENS.Logger) private logger: ILogger,
    @Inject(TOKENS.Database) private db: Kysely<Database>,
  ) {}

  @Cron('0 3 * * *', {
    name: 'daily-cleanup',
    timeout: 300000, // 5 minutes
  })
  async cleanupOldSessions(): Promise<void> {
    this.logger.info('Starting daily session cleanup');

    const result = await this.db
      .deleteFrom('sessions')
      .where('expires_at', '<', new Date())
      .executeTakeFirst();

    this.logger.info(`Deleted ${result.numDeletedRows ?? 0} expired sessions`);
  }

  @Cron('0 */6 * * *', {
    name: 'file-cleanup',
    maxRetries: 3,
  })
  async cleanupTempFiles(): Promise<void> {
    this.logger.info('Starting temporary file cleanup');

    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.db
      .deleteFrom('files')
      .where('created_at', '<', cutoffDate)
      .executeTakeFirst();

    this.logger.info(`Deleted ${result.numDeletedRows ?? 0} old files`);
  }
}
