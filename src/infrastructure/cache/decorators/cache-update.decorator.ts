// src/infrastructure/cache/decorators/cache-update.decorator.ts
import { CacheOptions } from '../strategies/cache-strategy.interface';
import { getCacheService } from './cache-helper';

export interface CacheUpdateOptions extends CacheOptions {
  key: (...args: any[]) => string;
  value?: (result: any, ...args: any[]) => any;
}

export function CacheUpdate(options: CacheUpdateOptions): MethodDecorator {
  return function (
    _target: any,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      const cacheService = getCacheService();
      
      // Generate cache key
      const key = options.key(...args);
      
      // Determine value to cache
      const valueToCache = options.value 
        ? options.value(result, ...args)
        : result;
      
      // Update cache
      await cacheService.set(key, valueToCache, options);
      
      return result;
    };
    
    return descriptor;
  };
}