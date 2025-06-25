// src/infrastructure/rate-limit/types.ts
export type RateLimitStrategy = 'token-bucket' | 'sliding-window' | 'fixed-window';

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed
   */
  max: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Strategy to use for rate limiting
   */
  strategy?: RateLimitStrategy;

  /**
   * Key generator function - returns the key to use for rate limiting
   */
  keyGenerator?: (req: Request) => string;

  /**
   * Whether to skip successful requests
   */
  skipSuccessfulRequests?: boolean;

  /**
   * Whether to skip failed requests (4xx, 5xx)
   */
  skipFailedRequests?: boolean;

  /**
   * Custom message when rate limit is exceeded
   */
  message?: string;

  /**
   * HTTP status code when rate limit is exceeded
   */
  statusCode?: number;

  /**
   * Headers to set on the response
   */
  headers?: boolean;

  /**
   * Whitelist of IPs or user IDs to skip rate limiting
   */
  whitelist?: string[];

  /**
   * Store to use (redis key prefix)
   */
  keyPrefix?: string;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetAt: Date;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitInfo>;
  decrement(key: string): Promise<void>;
  reset(key: string): Promise<void>;
  get(key: string): Promise<RateLimitInfo | null>;
}

export interface RateLimiter {
  isAllowed(key: string): Promise<boolean>;
  consume(key: string): Promise<RateLimitInfo>;
  reset(key: string): Promise<void>;
  getRateLimitInfo(key: string): Promise<RateLimitInfo | null>;
}

// For Express augmentation
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetAt: Date;
      };
    }
  }
}
