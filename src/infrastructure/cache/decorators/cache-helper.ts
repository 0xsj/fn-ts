// src/infrastructure/cache/decorators/cache-helper.ts
import type { CacheService } from '../cache.service';
import type { DIContainer as DIContainerType } from '../../../core/di/container';
import type { TOKENS as TokensType } from '../../../core/di/tokens';

let cacheServiceInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    const { DIContainer } = require('../../../core/di/container') as { DIContainer: typeof DIContainerType };
    const { TOKENS } = require('../../../core/di/tokens') as { TOKENS: typeof TokensType };
    cacheServiceInstance = DIContainer.resolve<CacheService>(TOKENS.CacheService);
  }
  return cacheServiceInstance;
}