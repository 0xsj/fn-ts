// src/infrastructure/rate-limit/rate-limit.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { RateLimitOptions } from './types';
import { createRateLimiter, RateLimiterImpl } from './rate-limiter';
import { RateLimitError } from '../../shared/response';
import { logger } from '../../shared/utils/logger';

export function rateLimitMiddleware(options: RateLimitOptions) {
  const rateLimiter = createRateLimiter(options) as RateLimiterImpl;
  const limiterOptions = rateLimiter.getOptions();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Generate key for this request
      const key = limiterOptions.keyGenerator(req);
      
      // Check if request is allowed
      const rateLimitInfo = await rateLimiter.consume(key);
      
      // Store rate limit info on request for later use
      req.rateLimit = {
        limit: rateLimitInfo.limit,
        current: rateLimitInfo.current,
        remaining: rateLimitInfo.remaining,
        resetAt: rateLimitInfo.resetAt,
      };

      // Set headers if enabled
      if (limiterOptions.headers) {
        res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit.toString());
        res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
        res.setHeader('X-RateLimit-Reset', rateLimitInfo.resetAt.toISOString());
        res.setHeader('X-RateLimit-Reset-After', Math.max(0, Math.ceil((rateLimitInfo.resetAt.getTime() - Date.now()) / 1000)).toString());
      }

      // Check if limit exceeded
      if (rateLimitInfo.current > rateLimitInfo.limit) {
        // Set Retry-After header
        const retryAfter = Math.max(0, Math.ceil((rateLimitInfo.resetAt.getTime() - Date.now()) / 1000));
        res.setHeader('Retry-After', retryAfter.toString());

        const error = new RateLimitError(
          retryAfter,
          req.context?.correlationId,
          rateLimitInfo.limit
        );

        // Log rate limit exceeded
        if (req.context) {
          logger.withRequest(req.context).warn('Rate limit exceeded', {
            key,
            limit: rateLimitInfo.limit,
            current: rateLimitInfo.current,
          });
        }

        req.context?.setResponse(error);
        return error.send(res);
      }

      // Set up post-processing
      if (limiterOptions.skipSuccessfulRequests || limiterOptions.skipFailedRequests) {
        const originalSend = res.send;
        res.send = function(data: any): Response {
          // Post-process after response is sent
          rateLimiter.postProcess(key, res.statusCode).catch(err => {
            logger.error('Rate limit post-process error', { error: err });
          });
          
          return originalSend.call(this, data);
        };
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error', { error });
      // On error, allow the request (fail open)
      next();
    }
  };
}

// Pre-configured middleware factories
export const rateLimits = {
  /**
   * Strict rate limit for authentication endpoints
   */
  auth: () => rateLimitMiddleware({
    max: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
    strategy: 'sliding-window',
  }),

  /**
   * Standard API rate limit
   */
  api: () => rateLimitMiddleware({
    max: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    skipFailedRequests: true,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      const userId = req.context?.getMetadata('userId') as string;
      return userId || req.ip || 'unknown';
    },
  }),

  /**
   * Lenient rate limit for read operations
   */
  read: () => rateLimitMiddleware({
    max: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    skipFailedRequests: true,
  }),

  /**
   * Strict rate limit for write operations
   */
  write: () => rateLimitMiddleware({
    max: 50,
    windowMs: 15 * 60 * 1000, // 15 minutes
    strategy: 'sliding-window',
  }),

  /**
   * Very strict rate limit for expensive operations
   */
  expensive: () => rateLimitMiddleware({
    max: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    strategy: 'sliding-window',
    message: 'This operation is rate limited. Please try again later.',
  }),

  /**
   * Custom rate limit
   */
  custom: (max: number, windowMs: number) => rateLimitMiddleware({
    max,
    windowMs,
  }),
};