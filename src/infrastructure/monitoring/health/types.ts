// src/infrastructure/monitoring/health/types.ts
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  status: HealthStatus;
  responseTime?: number;
  details?: Record<string, any>;
  error?: string;
  lastChecked: Date;
}

export interface HealthIndicator {
  name: string;
  check(): Promise<HealthCheckResult>;
  isEssential?: boolean; // If true, failure makes overall status unhealthy
}

export interface HealthCheckOptions {
  timeout?: number; // Timeout for individual checks
  cacheDuration?: number; // Cache results for this many ms
  includeDetails?: boolean; // Include detailed info in response
  parallel?: boolean; // Run checks in parallel or sequential
}

export interface SystemHealth {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  checks: Record<string, HealthCheckResult>;
}

export interface HealthThresholds {
  disk?: {
    warningPercent: number;
    criticalPercent: number;
  };
  memory?: {
    warningPercent: number;
    criticalPercent: number;
  };
  responseTime?: {
    warningMs: number;
    criticalMs: number;
  };
}

// Circuit breaker for health checks
export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening
  resetTimeout: number; // Time before trying again (ms)
  halfOpenRetries: number; // Number of retries in half-open state
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failures: number;
  lastFailure?: Date;
  nextRetry?: Date;
}

export interface HealthCheckData {
  status: HealthStatus;
  details?: Record<string, any>;
  error?: string;
}

export interface HealthIndicator {
  name: string;
  check(): Promise<HealthCheckResult>;
  isEssential?: boolean;
}
