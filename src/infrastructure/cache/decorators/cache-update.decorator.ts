import { CacheOptions } from '../strategies/cache-strategy.interface';
import { getCacheService } from './cache-helper';
import { logger } from '../../../shared/utils/logger';
import { isSuccessResponse } from '../../../shared/response';

export interface CacheUpdateOptions extends CacheOptions {
  key: (...args: any[]) => string;
  value?: (result: any, ...args: any[]) => any;
}

export function CacheUpdate(options: CacheUpdateOptions): MethodDecorator {
  return function (
    _target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    
    const newMethod = async function (this: any, ...args: any[]) {
      logger.debug(`CacheUpdate decorator called for ${propertyKey.toString()} with args:`, 
        args.map((arg, i) => `[${i}]: ${typeof arg} = ${JSON.stringify(arg).substring(0, 100)}`)
      );
      
      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Only update cache for successful responses
      if (isSuccessResponse(result)) {
        const cacheService = getCacheService();
        
        let keyArgs = args;
        if (args.length > 1) {
          const lastArg = args[args.length - 1];
          if (typeof lastArg === 'string' && lastArg.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            keyArgs = args.slice(0, -1);
          }
        }
        
        logger.debug(`Filtered keyArgs:`, keyArgs);
        
        const key = options.key(...keyArgs);
        logger.debug(`Generated cache update key: ${key}`);
        
        // Determine value to cache - cache the entire response
        const valueToCache = options.value 
          ? options.value(result, ...args)
          : result;
        
        // Update cache
        await cacheService.set(key, valueToCache, options);
      }
      
      return result;
    };
    
    // Preserve method properties
    Object.defineProperty(newMethod, 'name', { value: originalMethod.name });
    Object.defineProperty(newMethod, 'length', { value: originalMethod.length });
    
    descriptor.value = newMethod;
    return descriptor;
  };
}