import { CacheOptions } from '../strategies/cache-strategy.interface';
import { getCacheService } from './cache-helper';
import { isSuccessResponse, SuccessResponse } from '../../../shared/response';
import { logger } from '../../../shared/utils/logger';

export interface CacheableOptions extends CacheOptions {
  keyPrefix?: string;
  condition?: (...args: any[]) => boolean;
}

export function Cacheable(options?: CacheableOptions): MethodDecorator {
  return function (
    _target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    // Create a new function that properly captures arguments
    const newMethod = async function (this: any, ...args: any[]) {
      logger.debug(
        `Cacheable decorator called for ${propertyKey.toString()} with ${args.length} args:`,
        args,
      );

      // Check condition if provided
      if (options?.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      const cacheService = getCacheService();
      const className = this.constructor.name;
      const methodName = String(propertyKey);

      // Generate cache key
      const baseKey = cacheService.generateKey(className, methodName, args);
      const key = options?.keyPrefix ? `${options.keyPrefix}:${baseKey}` : baseKey;

      // Try to get from cache
      const cached = await cacheService.get<any>(key);
      if (cached !== null) {
        logger.debug(`Cache HIT for ${methodName}`);

        // Reconstruct the Response object from cached data
        if (
          cached &&
          typeof cached === 'object' &&
          'success' in cached &&
          cached.success === true
        ) {
          return new SuccessResponse(
            cached.data,
            cached.statusCode || 200,
            cached.meta?.correlationId,
            cached.meta,
          );
        }

        return cached;
      }

      logger.debug(`Cache MISS for ${methodName}, calling original method`);

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Only cache successful responses
      if (isSuccessResponse(result)) {
        logger.debug(`Caching successful response for ${methodName}`);

        // Cache the response body data
        const cacheData = {
          success: true,
          data: result.body().data,
          statusCode: result.statusCode,
          meta: {
            correlationId: result.correlationId,
            timestamp: result.timestamp,
          },
        };

        await cacheService.set(key, cacheData, options);
      } else {
        logger.debug(`Not caching failed response for ${methodName}`);
      }

      return result;
    };

    // Preserve method name and length
    Object.defineProperty(newMethod, 'name', { value: originalMethod.name });
    Object.defineProperty(newMethod, 'length', { value: originalMethod.length });

    // Replace the method
    descriptor.value = newMethod;

    return descriptor;
  };
}
