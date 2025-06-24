// src/infrastructure/cache/decorators/cache-update.decorator.ts
import { CacheService } from '../cache.service';
import { CacheOptions } from '../strategies/cache-strategy.interface';
import { DIContainer } from '../../../core/di/container';
import { TOKENS } from '../../../core/di/tokens';

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
      const cacheService = DIContainer.resolve<CacheService>(TOKENS.CacheService);
      
      // Execute original method
      const result = await originalMethod.apply(this, args);
      
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