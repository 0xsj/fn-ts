// src/infrastructure/events/handlers/user/invalidate-user-cache.handler.ts
import { BaseEventHandler } from '../base.handler';
import { UserUpdatedEvent, UserDeletedEvent } from '../../../../domain/events/user';
import { CacheService } from '../../../cache/cache.service';
import { DIContainer } from '../../../../core/di/container';
import { TOKENS } from '../../../../core/di/tokens';
import { logger } from '../../../../shared/utils';

type UserChangeEvent = UserUpdatedEvent | UserDeletedEvent;

export class InvalidateUserCacheHandler extends BaseEventHandler<UserChangeEvent> {
  private cacheService?: CacheService;

  constructor() {
    super('InvalidateUserCache');
    // Don't resolve here - wait until needed
  }

  private getCacheService(): CacheService {
    if (!this.cacheService) {
      this.cacheService = DIContainer.resolve<CacheService>(TOKENS.CacheService);
    }
    return this.cacheService;
  }

  protected async execute(event: UserChangeEvent): Promise<void> {
    const userId = event.payload.userId;

    // Get cache service lazily
    const cacheService = this.getCacheService();

    // Invalidate specific user cache - use invalidate instead of delete
    await cacheService.invalidate(`UserService:findUserById:${userId}`);

    // Invalidate user list cache (since it might include this user)
    await cacheService.invalidateByTags(['user-list']);

    logger.info('User cache invalidated', {
      userId,
      eventType: event.eventName,
    });
  }
}
