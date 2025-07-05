// src/infrastructure/monitoring/metrics/prometheus/prometheus-registry.ts
import { Registry, collectDefaultMetrics, Counter, Gauge, Histogram, Summary } from 'prom-client';
import { injectable } from 'tsyringe';
import { Injectable } from '../../../../core/di/decorators/injectable.decorator';

@Injectable()
export class PrometheusRegistry {
  private registry: Registry;

  // HTTP metrics - Use definite assignment assertion
  public httpRequestDuration!: Histogram<string>;
  public httpRequestTotal!: Counter<string>;
  public httpRequestErrors!: Counter<string>;

  // Business metrics
  public activeUsers!: Gauge<string>;
  public userRegistrations!: Counter<string>;
  public loginAttempts!: Counter<string>;
  public apiKeyUsage!: Counter<string>;

  // System metrics
  public healthCheckStatus!: Gauge<string>;
  public cacheHits!: Counter<string>;
  public cacheMisses!: Counter<string>;
  public queueJobsProcessed!: Counter<string>;
  public queueJobsFailed!: Counter<string>;
  public queueJobDuration!: Histogram<string>;

  // Database metrics
  public dbConnectionPool!: Gauge<string>;
  public dbQueryDuration!: Histogram<string>;

  constructor() {
    this.registry = new Registry();

    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'firenotifications_',
    });

    // Initialize all metrics in constructor
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // HTTP Metrics
    this.httpRequestDuration = new Histogram({
      name: 'firenotifications_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.registry],
    });

    this.httpRequestTotal = new Counter({
      name: 'firenotifications_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestErrors = new Counter({
      name: 'firenotifications_http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.registry],
    });

    // Business Metrics
    this.activeUsers = new Gauge({
      name: 'firenotifications_active_users',
      help: 'Number of active users',
      labelNames: ['organization'],
      registers: [this.registry],
    });

    this.userRegistrations = new Counter({
      name: 'firenotifications_user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['type', 'organization'],
      registers: [this.registry],
    });

    this.loginAttempts = new Counter({
      name: 'firenotifications_login_attempts_total',
      help: 'Total number of login attempts',
      labelNames: ['status', 'provider'],
      registers: [this.registry],
    });

    this.apiKeyUsage = new Counter({
      name: 'firenotifications_api_key_usage_total',
      help: 'Total number of API key uses',
      labelNames: ['key_id', 'endpoint'],
      registers: [this.registry],
    });

    // System Metrics
    this.healthCheckStatus = new Gauge({
      name: 'firenotifications_health_check_status',
      help: 'Health check status (1=healthy, 0.5=degraded, 0=unhealthy)',
      labelNames: ['check_name'],
      registers: [this.registry],
    });

    this.cacheHits = new Counter({
      name: 'firenotifications_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_name'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'firenotifications_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_name'],
      registers: [this.registry],
    });

    // Queue Metrics
    this.queueJobsProcessed = new Counter({
      name: 'firenotifications_queue_jobs_processed_total',
      help: 'Total number of queue jobs processed',
      labelNames: ['queue_name', 'job_type'],
      registers: [this.registry],
    });

    this.queueJobsFailed = new Counter({
      name: 'firenotifications_queue_jobs_failed_total',
      help: 'Total number of queue jobs failed',
      labelNames: ['queue_name', 'job_type', 'error_type'],
      registers: [this.registry],
    });

    this.queueJobDuration = new Histogram({
      name: 'firenotifications_queue_job_duration_seconds',
      help: 'Duration of queue job processing in seconds',
      labelNames: ['queue_name', 'job_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
      registers: [this.registry],
    });

    // Database Metrics
    this.dbConnectionPool = new Gauge({
      name: 'firenotifications_db_connection_pool',
      help: 'Database connection pool status',
      labelNames: ['status'], // active, idle, waiting
      registers: [this.registry],
    });

    this.dbQueryDuration = new Histogram({
      name: 'firenotifications_db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
  }

  public getRegistry(): Registry {
    return this.registry;
  }

  public async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
