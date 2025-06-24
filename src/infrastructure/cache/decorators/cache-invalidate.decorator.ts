// src/infrastructure/cache/decorators/cache-invalidate.decorator.ts
import { CacheService } from '../cache.service';
import { DIContainer } from '../../../core/di/container';
import { TOKENS } from '../../../core/di/tokens';

export interface CacheInvalidateOptions {
  keys?: ((...args: any[]) => string[]) | string[];
  patterns?: ((...args: any[]) => string[]) | string[];
  tags?: ((...args: any[]) => string[]) | string[];
  afterMethod?: boolean; // Invalidate after method execution (default: true)
}

export function CacheInvalidate(options: CacheInvalidateOptions): MethodDecorator {
  return function (
    _target: any,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheService = DIContainer.resolve<CacheService>(TOKENS.CacheService);
      const afterMethod = options.afterMethod !== false;
      
      const performInvalidation = async () => {
        // Invalidate specific keys
        if (options.keys) {
          const keys = typeof options.keys === 'function' 
            ? options.keys(...args) 
            : options.keys;
          
          for (const key of keys) {
            await cacheService.invalidate(key);
          }
        }
        
        // Invalidate patterns
        if (options.patterns) {
          const patterns = typeof options.patterns === 'function'
            ? options.patterns(...args)
            : options.patterns;
          
          for (const pattern of patterns) {
            await cacheService.invalidatePattern(pattern);
          }
        }
        
        // Invalidate tags
        if (options.tags) {
          const tags = typeof options.tags === 'function'
            ? options.tags(...args)
            : options.tags;
          
          await cacheService.invalidateByTags(tags);
        }
      };
      
      if (!afterMethod) {
        await performInvalidation();
      }
      
      const result = await originalMethod.apply(this, args);
      
      if (afterMethod) {
        await performInvalidation();
      }
      
      return result;
    };
    
    return descriptor;
  };
}