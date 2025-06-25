// src/infrastructure/events/handlers/user/invalidate-user-cache.handler.ts
import { BaseEventHandler } from '../base.handler';
import { UserUpdatedEvent, UserDeletedEvent } from '../../../../domain/events/user';
import { CacheService } from '../../../cache/cache.service';
import { DIContainer } from '../../../../core/di/container';
import { TOKENS } from '../../../../core/di/tokens';
import { logger } from '../../../../shared/utils';

type UserChangeEvent = UserUpdatedEvent | UserDeletedEvent;

export class InvalidateUserCacheHandler extends BaseEventHandler<UserChangeEvent> {
  private cacheService: CacheService;

  constructor() {
    super('InvalidateUserCache');
    this.cacheService = DIContainer.resolve<CacheService>(TOKENS.CacheService);
  }

  protected async execute(event: UserChangeEvent): Promise<void> {
    const userId = event.payload.userId;

    // Invalidate specific user cache - use invalidate instead of delete
    await this.cacheService.invalidate(`UserService:findUserById:${userId}`);

    // Invalidate user list cache (since it might include this user)
    await this.cacheService.invalidateByTags(['user-list']);

    logger.info('User cache invalidated', {
      userId,
      eventType: event.eventName,
    });
  }
}
