// src/shared/decorators/rate-limit.decorator.ts
import { Request, Response, NextFunction } from 'express';
import { rateLimitMiddleware } from '../../infrastructure/rate-limit/rate-limit.middleware';
import { RateLimitOptions } from '../../infrastructure/rate-limit/types';

/**
 * Rate limit decorator for controller methods
 */
export function RateLimit(options: RateLimitOptions | 'auth' | 'api' | 'read' | 'write' | 'expensive'): MethodDecorator {
  return function (_target: any, _propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
      // Create middleware based on options
      let middleware: ReturnType<typeof rateLimitMiddleware>;
      
      if (typeof options === 'string') {
        // Use pre-configured rate limits
        switch (options) {
          case 'auth':
            middleware = rateLimitMiddleware({
              max: 5,
              windowMs: 15 * 60 * 1000,
              message: 'Too many authentication attempts, please try again later.',
              skipSuccessfulRequests: true,
              strategy: 'sliding-window',
            });
            break;
          case 'api':
            middleware = rateLimitMiddleware({
              max: 100,
              windowMs: 15 * 60 * 1000,
              skipFailedRequests: true,
            });
            break;
          case 'read':
            middleware = rateLimitMiddleware({
              max: 200,
              windowMs: 15 * 60 * 1000,
              skipFailedRequests: true,
            });
            break;
          case 'write':
            middleware = rateLimitMiddleware({
              max: 50,
              windowMs: 15 * 60 * 1000,
              strategy: 'sliding-window',
            });
            break;
          case 'expensive':
            middleware = rateLimitMiddleware({
              max: 10,
              windowMs: 60 * 60 * 1000,
              strategy: 'sliding-window',
            });
            break;
          default:
            throw new Error(`Unknown rate limit preset: ${options}`);
        }
      } else {
        middleware = rateLimitMiddleware(options);
      }

      // Apply middleware
      middleware(req, res, (error?: any) => {
        if (error) {
          return next(error);
        }
        // Call original method
        return originalMethod.apply(this, [req, res, next]);
      });
    };

    return descriptor;
  };
}