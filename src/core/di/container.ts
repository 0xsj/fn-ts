// src/core/di/container.ts
import 'reflect-metadata';
import { container } from 'tsyringe';
import { Kysely } from 'kysely';
import type { Database } from '../../infrastructure/database/types';
import { createDatabase } from '../../infrastructure/database/connection';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { UserService } from '../../domain/services/user.service';
import { RedisClient } from '../../infrastructure/cache/redis.client';
import { CacheManager } from '../../infrastructure/cache/cache.manager';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { HealthCheckService } from '../../infrastructure/monitoring/health/health-check.service';
import { EventBus } from '../../infrastructure/events/event-bus';
import { registerEventHandlers } from '../../infrastructure/events/event-bus.registry';
import { QueueManager } from '../../infrastructure/queue/queue.manager';
import { logger } from '../../shared/utils';
import { TOKENS } from './tokens';
import {
  AccessControlRepository,
  AuthRepository,
  CommunicationRepository,
  FileRepository,
  LocationRepository,
  NotificationRepository,
  OperationsRepository,
  OrganizationRepository,
} from '../../infrastructure/database/repositories';
import { AnalyticsRepository } from '../../infrastructure/database/repositories/analytics.repository';
import {
  AccessControlService,
  AuthService,
  CommunicationService,
  FileService,
  LocationService,
  NotificationService,
  OperationsService,
  OrganizationService,
} from '../../domain/services';
import { AnalyticsService } from '../../domain/services/analytics.service';

// Add these imports for metrics
import { PrometheusRegistry } from '../../infrastructure/monitoring/metrics/prometheus/prometheus-registry';
import { MetricsService } from '../../infrastructure/monitoring/metrics/metrics.service';
import { HealthCollector } from '../../infrastructure/monitoring/metrics/collectors/health.collector';
import { HttpCollector } from '../../infrastructure/monitoring/metrics/collectors/http.collector';
import { QueueCollector } from '../../infrastructure/monitoring/metrics/collectors/queue.collector';
import { BusinessCollector } from '../../infrastructure/monitoring/metrics/collectors/business.collector';
import { EmailService } from '../../infrastructure/integrations/email/email.service';

export class DIContainer {
  private static initialized = false;

  private static async registerQueues(): Promise<void> {
    container.registerSingleton(TOKENS.QueueManager, QueueManager);

    // Initialize queue manager
    const queueManager = container.resolve<QueueManager>(TOKENS.QueueManager);
    await queueManager.initialize();

    logger.info('Queue system initialized');
  }

  // src/core/di/container.ts (update the initialize method)
  static async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('DI Container already initialized');
      return;
    }

    try {
      logger.info('Starting DI Container initialization...');

      logger.info('Registering database...');
      await this.registerDatabase();

      logger.info('Registering cache...');
      await this.registerCache();

      logger.info('Registering repositories...');
      this.registerRepositories();

      logger.info('Registering services...');
      this.registerServices();

      logger.info('Registering integrations');
      this.registerIntegrationServices();

      logger.info('Registering queues...');
      await this.registerQueues();

      logger.info('Registering event bus...');
      this.registerEventBus();

      logger.info('Registering health check...');
      this.registerHealthCheck();

      logger.info('Registering metrics...');
      this.registerMetrics();

      this.initialized = true;
      logger.info('DI Container initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DI Container', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error?.constructor?.name,
        errorDetails: error,
      });
      throw error;
    }
  }

  private static async registerDatabase(): Promise<void> {
    const db = await createDatabase();
    container.registerInstance<Kysely<Database>>(TOKENS.Database, db);
  }

  private static async registerCache(): Promise<void> {
    const redisClient = RedisClient.getInstance();
    await redisClient.connect();
    container.registerInstance(TOKENS.RedisClient, redisClient);

    // Register CacheManager first as a singleton
    container.registerSingleton(TOKENS.CacheManager, CacheManager);

    // Register CacheService as a singleton that depends on CacheManager
    container.register(TOKENS.CacheService, {
      useFactory: (c) => {
        const cacheManager = c.resolve<CacheManager>(TOKENS.CacheManager);
        return new CacheService(cacheManager);
      },
    });
  }

  private static registerRepositories(): void {
    container.register(TOKENS.AccessControlRepository, {
      useFactory: (c) => {
        const db = c.resolve<Kysely<Database>>(TOKENS.Database);
        return new AccessControlRepository(db);
      },
    });

    container.register(TOKENS.AnalyticsRepository, {
      useFactory: (c) => {
        const db = c.resolve<Kysely<Database>>(TOKENS.Database);
        return new AnalyticsRepository(db);
      },
    });
    container.register(TOKENS.AuthRepository, {
      useFactory: (c) => {
        const db = c.resolve<Kysely<Database>>(TOKENS.Database);
        return new AuthRepository(db);
      },
    });
    container.register(TOKENS.CommunicationRepository, {
      useFactory: (c) => {
        const db = c.resolve<Kysely<Database>>(TOKENS.Database);
        return new CommunicationRepository(db);
      },
    });
    container.register(TOKENS.FileRepository, {
      useFactory: (c) => {
        const db = c.resolve<Kysely<Database>>(TOKENS.Database);
        return new FileRepository(db);
      },
    });

    container.register(TOKENS.LocationRepository, {
      useFactory: (c) => {
        const db = c.resolve<Kysely<Database>>(TOKENS.Database);
        return new LocationRepository(db);
      },
    });

    container.register(TOKENS.NotificationRepository, {
      useFactory: (c) => {
        const db = c.resolve<Kysely<Database>>(TOKENS.Database);
        return new NotificationRepository(db);
      },
    });

    container.register(TOKENS.OperationsRepository, {
      useFactory: (c) => {
        const db = c.resolve<Kysely<Database>>(TOKENS.Database);
        return new OperationsRepository(db);
      },
    });
    container.register(TOKENS.OrganizationRepository, {
      useFactory: (c) => {
        const db = c.resolve<Kysely<Database>>(TOKENS.Database);
        return new OrganizationRepository(db);
      },
    });

    container.register(TOKENS.UserRepository, {
      useFactory: (c) => {
        const db = c.resolve<Kysely<Database>>(TOKENS.Database);
        return new UserRepository(db);
      },
    });
  }

  private static registerServices(): void {
    container.registerSingleton(TOKENS.UserService, UserService);
    container.registerSingleton(TOKENS.AuthService, AuthService);
    container.registerSingleton(TOKENS.OrganizationService, OrganizationService);
    container.registerSingleton(TOKENS.AccessControlService, AccessControlService);
    container.registerSingleton(TOKENS.NotificationService, NotificationService);
    container.registerSingleton(TOKENS.CommunicationService, CommunicationService);
    container.registerSingleton(TOKENS.LocationService, LocationService);
    container.registerSingleton(TOKENS.FileService, FileService);
    container.registerSingleton(TOKENS.OperationsService, OperationsService);
    container.registerSingleton(TOKENS.AnalyticsService, AnalyticsService);
  }

  private static registerIntegrationServices(): void {
    // Register Email Service
    container.registerSingleton(TOKENS.EmailService, EmailService);

    // Future services can be added here:
    // container.registerSingleton(TOKENS.SmsService, SmsService);
    // container.registerSingleton(TOKENS.StorageService, StorageService);

    logger.info('Integration services registered');
  }

  // Add this new method for EventBus
  private static registerEventBus(): void {
    // Register EventBus as singleton
    container.registerSingleton(TOKENS.EventBus, EventBus);

    // Get the EventBus instance and register handlers
    const eventBus = container.resolve<EventBus>(TOKENS.EventBus);
    registerEventHandlers(eventBus);

    logger.info('Event bus registered and handlers configured');
  }

  private static registerHealthCheck(): void {
    container.registerSingleton(TOKENS.HealthCheckService, HealthCheckService);
  }

  private static registerMetrics(): void {
    try {
      // Register Prometheus Registry
      logger.debug('Registering PrometheusRegistry...');
      container.registerSingleton(TOKENS.PrometheusRegistry, PrometheusRegistry);

      // Register collectors with proper dependency injection
      logger.debug('Registering HealthCollector...');
      container.register(TOKENS.HealthCollector, {
        useFactory: (c) => {
          const registry = c.resolve<PrometheusRegistry>(TOKENS.PrometheusRegistry);
          const healthService = c.resolve<HealthCheckService>(TOKENS.HealthCheckService);
          return new HealthCollector(registry, healthService);
        },
      });

      logger.debug('Registering HttpCollector...');
      container.register(TOKENS.HttpCollector, {
        useFactory: (c) => {
          const registry = c.resolve<PrometheusRegistry>(TOKENS.PrometheusRegistry);
          return new HttpCollector(registry);
        },
      });

      logger.debug('Registering QueueCollector...');
      container.register(TOKENS.QueueCollector, {
        useFactory: (c) => {
          const registry = c.resolve<PrometheusRegistry>(TOKENS.PrometheusRegistry);
          const queueManager = c.resolve<QueueManager>(TOKENS.QueueManager);
          return new QueueCollector(registry, queueManager);
        },
      });

      logger.debug('Registering BusinessCollector...');
      container.register(TOKENS.BusinessCollector, {
        useFactory: (c) => {
          const registry = c.resolve<PrometheusRegistry>(TOKENS.PrometheusRegistry);
          const userService = c.resolve<UserService>(TOKENS.UserService);
          const organizationService = c.resolve<OrganizationService>(TOKENS.OrganizationService);
          return new BusinessCollector(registry, userService, organizationService);
        },
      });

      // Register MetricsService with explicit dependencies
      logger.debug('Registering MetricsService...');
      container.register(TOKENS.MetricsService, {
        useFactory: (c) => {
          const prometheusRegistry = c.resolve<PrometheusRegistry>(TOKENS.PrometheusRegistry);
          const healthCollector = c.resolve<HealthCollector>(TOKENS.HealthCollector);
          const httpCollector = c.resolve<HttpCollector>(TOKENS.HttpCollector);
          const queueCollector = c.resolve<QueueCollector>(TOKENS.QueueCollector);
          const businessCollector = c.resolve<BusinessCollector>(TOKENS.BusinessCollector);

          return new MetricsService(
            prometheusRegistry,
            healthCollector,
            httpCollector,
            queueCollector,
            businessCollector,
          );
        },
      });

      // Initialize metrics collection
      logger.debug('Starting metrics collection...');
      const metricsService = container.resolve<MetricsService>(TOKENS.MetricsService);
      metricsService.startCollection();

      logger.info('Metrics system initialized');
    } catch (error) {
      logger.error('Failed to register metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  static resolve<T>(token: symbol): T {
    return container.resolve<T>(token);
  }

  static async dispose(): Promise<void> {
    // Stop metrics collection
    try {
      const metricsService = container.resolve<MetricsService>(TOKENS.MetricsService);
      await metricsService.stopCollection();
    } catch (error) {
      logger.warn('Failed to stop metrics collection', error);
    }

    // Get queue manager and shut it down
    const queueManager = container.resolve<QueueManager>(TOKENS.QueueManager);
    await queueManager.shutdown();

    const db = container.resolve<Kysely<Database>>(TOKENS.Database);
    await db.destroy();

    const redisClient = container.resolve<RedisClient>(TOKENS.RedisClient);
    await redisClient.disconnect();

    container.reset();
    this.initialized = false;
  }
}

export { container };
