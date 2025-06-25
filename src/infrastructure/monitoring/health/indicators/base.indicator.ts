// src/infrastructure/monitoring/health/indicators/base.indicator.ts
import { HealthIndicator, HealthCheckResult, HealthCheckData, HealthStatus, CircuitBreakerOptions, CircuitBreakerState } from '../types';
import { logger } from '../../../../shared/utils/logger';

export abstract class BaseHealthIndicator implements HealthIndicator {
  abstract name: string;
  isEssential: boolean = false;
  
  private circuitBreaker?: CircuitBreakerState;
  private circuitBreakerOptions?: CircuitBreakerOptions;
  private lastResult?: HealthCheckResult;
  private lastCheckTime?: Date;
  private cacheDuration: number = 5000; // 5 seconds default

  constructor(options?: {
    isEssential?: boolean;
    circuitBreaker?: CircuitBreakerOptions;
    cacheDuration?: number;
  }) {
    if (options?.isEssential !== undefined) {
      this.isEssential = options.isEssential;
    }
    
    if (options?.circuitBreaker) {
      this.circuitBreakerOptions = options.circuitBreaker;
      this.circuitBreaker = {
        isOpen: false,
        failures: 0,
      };
    }
    
    if (options?.cacheDuration !== undefined) {
      this.cacheDuration = options.cacheDuration;
    }
  }

  async check(): Promise<HealthCheckResult> {
    // Check cache first
    if (this.lastResult && this.lastCheckTime) {
      const timeSinceLastCheck = Date.now() - this.lastCheckTime.getTime();
      if (timeSinceLastCheck < this.cacheDuration) {
        return this.lastResult;
      }
    }

    // Check circuit breaker
    if (this.circuitBreaker?.isOpen) {
      if (this.circuitBreaker.nextRetry && Date.now() < this.circuitBreaker.nextRetry.getTime()) {
        return {
          status: 'unhealthy',
          error: 'Circuit breaker open',
          lastChecked: new Date(),
          details: {
            nextRetry: this.circuitBreaker.nextRetry,
            failures: this.circuitBreaker.failures,
          },
        };
      } else {
        // Try half-open state
        this.circuitBreaker.isOpen = false;
      }
    }

    const startTime = Date.now();
    
    try {
      const result = await this.performCheck();
      const responseTime = Date.now() - startTime;
      
      const finalResult: HealthCheckResult = {
        ...result,
        responseTime,
        lastChecked: new Date(),
      };

      // Reset circuit breaker on success
      if (this.circuitBreaker && result.status === 'healthy') {
        this.circuitBreaker.failures = 0;
        this.circuitBreaker.isOpen = false;
      }

      // Cache result
      this.lastResult = finalResult;
      this.lastCheckTime = new Date();

      return finalResult;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Handle circuit breaker
      if (this.circuitBreaker && this.circuitBreakerOptions) {
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailure = new Date();
        
        if (this.circuitBreaker.failures >= this.circuitBreakerOptions.failureThreshold) {
          this.circuitBreaker.isOpen = true;
          this.circuitBreaker.nextRetry = new Date(
            Date.now() + this.circuitBreakerOptions.resetTimeout
          );
          
          logger.warn(`Circuit breaker opened for health check: ${this.name}`, {
            failures: this.circuitBreaker.failures,
            nextRetry: this.circuitBreaker.nextRetry,
          });
        }
      }

      const errorResult: HealthCheckResult = {
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };

      // Cache error result too
      this.lastResult = errorResult;
      this.lastCheckTime = new Date();

      return errorResult;
    }
  }

  // Changed return type to HealthCheckData
  protected abstract performCheck(): Promise<HealthCheckData>;

  protected determineStatus(
    value: number,
    warningThreshold: number,
    criticalThreshold: number,
    inverse: boolean = false
  ): HealthStatus {
    if (inverse) {
      // For metrics where lower is worse (like free space)
      if (value <= criticalThreshold) return 'unhealthy';
      if (value <= warningThreshold) return 'degraded';
      return 'healthy';
    } else {
      // For metrics where higher is worse (like CPU usage)
      if (value >= criticalThreshold) return 'unhealthy';
      if (value >= warningThreshold) return 'degraded';
      return 'healthy';
    }
  }
}