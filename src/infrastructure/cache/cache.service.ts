import { injectable } from 'tsyringe';
import { CacheManager } from './cache.manager';
import { CacheOptions } from './strategies/cache-strategy.interface';
import crypto from 'crypto';
import { logger } from '../../shared/utils/logger';

@injectable()
export class CacheService {
  constructor(private cacheManager: CacheManager) {}

  /**
   * Generate a cache key from method name and arguments
   */
  generateKey(className: string, methodName: string, args: any[]): string {
    // Debug logging - show actual args
    logger.debug(
      `Generating cache key for ${className}.${methodName} with args:`,
      args.map((arg, i) => `[${i}]: ${typeof arg} = ${JSON.stringify(arg).substring(0, 100)}`),
    );

    let keyArgs = args;

    // If the last argument looks like a correlation ID, exclude it
    if (args.length > 1) {
      const lastArg = args[args.length - 1];
      if (
        typeof lastArg === 'string' &&
        lastArg.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      ) {
        keyArgs = args.slice(0, -1);
      }
    }

    logger.debug(`Filtered args for key:`, keyArgs);

    // For simple single-ID methods, just use the ID directly
    if (keyArgs.length === 1 && typeof keyArgs[0] === 'string') {
      const key = `${className}:${methodName}:${keyArgs[0]}`;
      logger.debug(`Generated simple key: ${key}`);
      return key;
    }

    // For methods with no args (like findAllUsers)
    if (keyArgs.length === 0) {
      const key = `${className}:${methodName}`;
      logger.debug(`Generated no-args key: ${key}`);
      return key;
    }

    // For other cases, create a hash
    const argsHash = crypto.createHash('md5').update(JSON.stringify(keyArgs)).digest('hex');

    const key = `${className}:${methodName}:${argsHash}`;
    logger.debug(`Generated hash key: ${key}`);
    return key;
  }

  /**
   * Generate a cache key with custom prefix
   */
  generateCustomKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = params[key];
          return acc;
        },
        {} as Record<string, any>,
      );

    const paramsHash = crypto.createHash('md5').update(JSON.stringify(sortedParams)).digest('hex');

    return `${prefix}:${paramsHash}`;
  }

  async get<T>(key: string): Promise<T | null> {
    logger.debug(`CacheService.get called for key: ${key}`);
    const result = await this.cacheManager.get<T>(key);
    logger.debug(`CacheService.get result:`, result !== null ? 'HIT' : 'MISS');
    return result;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    logger.debug(`CacheService.set called for key: ${key}`, { options });
    return this.cacheManager.set(key, value, options);
  }

  async invalidate(key: string): Promise<boolean> {
    logger.debug(`CacheService.invalidate called for key: ${key}`);
    return this.cacheManager.invalidate(key);
  }

  async invalidatePattern(pattern: string): Promise<number> {
    logger.debug(`CacheService.invalidatePattern called for pattern: ${pattern}`);
    return this.cacheManager.invalidatePattern(pattern);
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    logger.debug(`CacheService.invalidateByTags called for tags:`, tags);
    return this.cacheManager.invalidateByTags(tags);
  }

  async remember<T>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate fresh value
    const value = await factory();

    // Store in cache
    await this.set(key, value, options);

    return value;
  }

  async delete(key: string): Promise<boolean> {
    logger.debug(`CacheService.delete called for key: ${key}`);
    return this.cacheManager.invalidate(key);
  }

  async wrap<T>(key: string, work: () => Promise<T>, options?: CacheOptions): Promise<T> {
    return this.remember(key, work, options);
  }
}
