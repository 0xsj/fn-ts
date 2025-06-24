// src/infrastructure/cache/cache.service.ts
import { injectable } from 'tsyringe';
import { CacheManager } from './cache.manager';
import { CacheOptions } from './strategies/cache-strategy.interface';
import crypto from 'crypto';

@injectable()
export class CacheService {
  constructor(private cacheManager: CacheManager) {}

  /**
   * Generate a cache key from method name and arguments
   */
  generateKey(className: string, methodName: string, args: any[]): string {
    const argsHash = crypto
      .createHash('md5')
      .update(JSON.stringify(args))
      .digest('hex');
    
    return `${className}:${methodName}:${argsHash}`;
  }

  /**
   * Generate a cache key with custom prefix
   */
  generateCustomKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);
    
    const paramsHash = crypto
      .createHash('md5')
      .update(JSON.stringify(sortedParams))
      .digest('hex');
    
    return `${prefix}:${paramsHash}`;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    return this.cacheManager.set(key, value, options);
  }

  async invalidate(key: string): Promise<boolean> {
    return this.cacheManager.invalidate(key);
  }

  async invalidatePattern(pattern: string): Promise<number> {
    return this.cacheManager.invalidatePattern(pattern);
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    return this.cacheManager.invalidateByTags(tags);
  }

  async remember<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    
    await this.set(key, value, options);
    
    return value;
  }

  async wrap<T>(
    key: string,
    work: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    return this.remember(key, work, options);
  }
}