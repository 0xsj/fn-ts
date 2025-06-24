import { getCacheService } from './cache-helper';
import { logger } from '../../../shared/utils/logger';

export interface CacheInvalidateOptions {
  keys?: ((...args: any[]) => string[]) | string[];
  patterns?: ((...args: any[]) => string[]) | string[];
  tags?: ((...args: any[]) => string[]) | string[];
  afterMethod?: boolean; // Invalidate after method execution (default: true)
}

export function CacheInvalidate(options: CacheInvalidateOptions): MethodDecorator {
  return function (
    _target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    const newMethod = async function (this: any, ...args: any[]) {
      logger.debug(
        `CacheInvalidate decorator called for ${propertyKey.toString()} with args:`,
        args,
      );

      const cacheService = getCacheService();
      const afterMethod = options.afterMethod !== false;

      const performInvalidation = async () => {
        // Only filter out the last argument if it's a correlation ID
        let keyArgs = args;
        if (args.length > 1) {
          const lastArg = args[args.length - 1];
          if (
            typeof lastArg === 'string' &&
            lastArg.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
          ) {
            keyArgs = args.slice(0, -1);
          }
        }

        // Invalidate specific keys
        if (options.keys) {
          const keys = typeof options.keys === 'function' ? options.keys(...keyArgs) : options.keys;

          for (const key of keys) {
            await cacheService.invalidate(key);
          }
        }

        // Invalidate patterns
        if (options.patterns) {
          const patterns =
            typeof options.patterns === 'function'
              ? options.patterns(...keyArgs)
              : options.patterns;

          for (const pattern of patterns) {
            await cacheService.invalidatePattern(pattern);
          }
        }

        // Invalidate tags
        if (options.tags) {
          const tags = typeof options.tags === 'function' ? options.tags(...keyArgs) : options.tags;

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

    Object.defineProperty(newMethod, 'name', { value: originalMethod.name });
    Object.defineProperty(newMethod, 'length', { value: originalMethod.length });

    descriptor.value = newMethod;
    return descriptor;
  };
}
