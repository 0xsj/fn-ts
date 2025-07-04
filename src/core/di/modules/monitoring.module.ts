// src/core/di/modules/monitoring.module.ts
import { BaseModule } from './base.module';
import { DependencyContainer } from 'tsyringe';
import { HealthCheckService } from '../../../infrastructure/monitoring/health/health-check.service';
import { PrometheusRegistry } from '../../../infrastructure/monitoring/metrics/prometheus/prometheus-registry';
import { MetricsService } from '../../../infrastructure/monitoring/metrics/metrics.service';
import { HealthCollector } from '../../../infrastructure/monitoring/metrics/collectors/health.collector';
import { HttpCollector } from '../../../infrastructure/monitoring/metrics/collectors/http.collector';
import { QueueCollector } from '../../../infrastructure/monitoring/metrics/collectors/queue.collector';
import { BusinessCollector } from '../../../infrastructure/monitoring/metrics/collectors/business.collector';
import { EventBus } from '../../../infrastructure/events/event-bus';
import { registerEventHandlers } from '../../../infrastructure/events/event-bus.registry';
import { QueueManager } from '../../../infrastructure/queue/queue.manager';
import { UserService } from '../../../domain/services/user.service';
import { OrganizationService } from '../../../domain/services/organization.service';
import { TOKENS } from '../tokens';

export class MonitoringModule extends BaseModule {
  constructor() {
    super('MonitoringModule');
  }

  register(container: DependencyContainer): void {
    try {
      this.log('Registering monitoring services...');

      // Register Health Check Service
      container.registerSingleton(TOKENS.HealthCheckService, HealthCheckService);

      // Register Event Bus and configure handlers
      container.registerSingleton(TOKENS.EventBus, EventBus);
      const eventBus = container.resolve<EventBus>(TOKENS.EventBus);
      registerEventHandlers(eventBus);
      this.log('Event bus registered with handlers');

      // Register Prometheus Registry
      container.registerSingleton(TOKENS.PrometheusRegistry, PrometheusRegistry);

      // Register collectors with their dependencies
      this.registerCollectors(container);

      // Register MetricsService with all collectors
      this.registerMetricsService(container);

      // Start metrics collection
      const metricsService = container.resolve<MetricsService>(TOKENS.MetricsService);
      metricsService.startCollection();

      this.log('Monitoring services initialized and metrics collection started');
    } catch (error) {
      this.logError('Failed to register monitoring services', error);
      throw error;
    }
  }

  private registerCollectors(container: DependencyContainer): void {
    // Health Collector
    container.register(TOKENS.HealthCollector, {
      useFactory: (c) => {
        const registry = c.resolve<PrometheusRegistry>(TOKENS.PrometheusRegistry);
        const healthService = c.resolve<HealthCheckService>(TOKENS.HealthCheckService);
        return new HealthCollector(registry, healthService);
      },
    });

    // HTTP Collector
    container.register(TOKENS.HttpCollector, {
      useFactory: (c) => {
        const registry = c.resolve<PrometheusRegistry>(TOKENS.PrometheusRegistry);
        return new HttpCollector(registry);
      },
    });

    // Queue Collector
    container.register(TOKENS.QueueCollector, {
      useFactory: (c) => {
        const registry = c.resolve<PrometheusRegistry>(TOKENS.PrometheusRegistry);
        const queueManager = c.resolve<QueueManager>(TOKENS.QueueManager);
        return new QueueCollector(registry, queueManager);
      },
    });

    // Business Collector
    container.register(TOKENS.BusinessCollector, {
      useFactory: (c) => {
        const registry = c.resolve<PrometheusRegistry>(TOKENS.PrometheusRegistry);
        const userService = c.resolve<UserService>(TOKENS.UserService);
        const organizationService = c.resolve<OrganizationService>(TOKENS.OrganizationService);
        return new BusinessCollector(registry, userService, organizationService);
      },
    });

    this.log('Metrics collectors registered');
  }

  private registerMetricsService(container: DependencyContainer): void {
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
  }
}
