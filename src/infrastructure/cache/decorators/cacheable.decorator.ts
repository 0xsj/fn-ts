// src/infrastructure/cache/decorators/cacheable.decorator.ts
import { CacheOptions } from '../strategies/cache-strategy.interface';
import { getCacheService } from './cache-helper';

export interface CacheableOptions extends CacheOptions {
  keyPrefix?: string;
  condition?: (...args: any[]) => boolean;
}

export function Cacheable(options?: CacheableOptions): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Check condition if provided
      if (options?.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }
      
      const cacheService = getCacheService();
      const className = target.constructor.name;
      const methodName = String(propertyKey);
      
      // Generate cache key
      const baseKey = cacheService.generateKey(className, methodName, args);
      const key = options?.keyPrefix ? `${options.keyPrefix}:${baseKey}` : baseKey;
      
      // Try to get from cache
      const cached = await cacheService.get(key);
      if (cached !== null) {
        return cached;
      }
      
      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Store in cache
      await cacheService.set(key, result, options);
      
      return result;
    };
    
    return descriptor;
  };
}