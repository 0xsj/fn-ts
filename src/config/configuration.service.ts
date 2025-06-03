/**
 * Configuration service for type-safe access to configuration
 * Works with the ConfigurationFactory and provides convenience methods
 *
 * File: src/config/configuration.service.ts
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from './configuration.schema';
import { ConfigurationFactory } from './configuration.factory';

/**
 * Type-safe configuration service
 * Wraps NestJS ConfigService with our typed configuration schema
 */
@Injectable()
export class ConfigurationService {
  constructor(
    private readonly configService: ConfigService<AppConfiguration, true>,
  ) {}

  // ============================================================================
  // App Configuration
  // ============================================================================

  get app() {
    return this.configService.get('app', { infer: true });
  }

  get isDevelopment(): boolean {
    return this.app.environment === 'development';
  }

  get isProduction(): boolean {
    return this.app.environment === 'production';
  }

  get isTest(): boolean {
    return this.app.environment === 'test';
  }

  get isStaging(): boolean {
    return this.app.environment === 'staging';
  }

  // ============================================================================
  // Database Configuration
  // ============================================================================

  get database() {
    return this.configService.get('database', { infer: true });
  }

  get databaseUrl(): string {
    const db = this.database;
    return `${db.type}://${db.username}:${db.password}@${db.host}:${db.port}/${db.database}`;
  }

  // ============================================================================
  // Security Configuration
  // ============================================================================

  get security() {
    return this.configService.get('security', { infer: true });
  }

  get jwt() {
    return this.security.jwt;
  }

  get bcrypt() {
    return this.security.bcrypt;
  }

  get session() {
    return this.security.session;
  }

  // ============================================================================
  // Services Configuration
  // ============================================================================

  get services() {
    return this.configService.get('services', { infer: true });
  }

  get redis() {
    return this.services.redis;
  }

  get email() {
    return this.services.email;
  }

  get storage() {
    return this.services.storage;
  }

  // ============================================================================
  // Logging Configuration
  // ============================================================================

  get logging() {
    return this.configService.get('logging', { infer: true });
  }

  // ============================================================================
  // Monitoring Configuration
  // ============================================================================

  get monitoring() {
    return this.configService.get('monitoring', { infer: true });
  }

  get health() {
    return this.monitoring.health;
  }

  get metrics() {
    return this.monitoring.metrics;
  }

  get swagger() {
    return this.monitoring.swagger;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get any configuration value by path (use carefully - not fully type-safe)
   * @param path Dot-notation path to configuration value
   * @returns Configuration value
   */
  get<T = any>(path: string): T {
    return this.configService.get(path as any);
  }

  /**
   * Get configuration value with default fallback
   * @param path Dot-notation path to configuration value
   * @param defaultValue Default value if path doesn't exist
   * @returns Configuration value or default
   */
  getOrThrow<T = any>(path: string, defaultValue?: T): T {
    return this.configService.getOrThrow(path as any, defaultValue);
  }

  /**
   * Check if a configuration path exists
   * @param path Dot-notation path to check
   * @returns true if path exists
   */
  has(path: string): boolean {
    try {
      const value = this.configService.get(path as any);
      return value !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Get full configuration object (useful for debugging)
   * Note: Be careful not to log sensitive values in production
   */
  getAll(): AppConfiguration {
    return {
      app: this.app,
      database: this.database,
      security: this.security,
      services: this.services,
      logging: this.logging,
      monitoring: this.monitoring,
    };
  }

  /**
   * Get sanitized configuration (removes sensitive values)
   * Safe for logging and debugging
   */
  getSanitized(): Partial<AppConfiguration> {
    const config = this.getAll();

    // Remove sensitive fields
    return {
      app: config.app,
      database: {
        ...config.database,
        password: '[REDACTED]',
      },
      security: {
        jwt: {
          ...config.security.jwt,
          secret: '[REDACTED]',
        },
        bcrypt: config.security.bcrypt,
        session: {
          ...config.security.session,
          secret: '[REDACTED]',
        },
      },
      services: {
        redis: {
          ...config.services.redis,
          password: config.services.redis.password ? '[REDACTED]' : undefined,
        },
        email: {
          ...config.services.email,
          smtp: config.services.email.smtp
            ? {
                ...config.services.email.smtp,
                auth: {
                  user: config.services.email.smtp.auth.user,
                  pass: '[REDACTED]',
                },
              }
            : undefined,
        },
        storage: {
          ...config.services.storage,
          s3: config.services.storage.s3
            ? {
                ...config.services.storage.s3,
                accessKeyId: '[REDACTED]',
                secretAccessKey: '[REDACTED]',
              }
            : undefined,
        },
      },
      logging: config.logging,
      monitoring: config.monitoring,
    };
  }

  // ============================================================================
  // Factory Methods (Static Access)
  // ============================================================================

  /**
   * Create configuration for specific environment
   * Useful for testing or environment-specific operations
   */
  static createForEnvironment(environment: string): AppConfiguration {
    return ConfigurationFactory.createForEnvironment(environment);
  }

  /**
   * Create test configuration
   */
  static createTestConfig(): AppConfiguration {
    return ConfigurationFactory.createTestConfig();
  }

  /**
   * Create development configuration
   */
  static createDevelopmentConfig(): AppConfiguration {
    return ConfigurationFactory.createDevelopmentConfig();
  }

  /**
   * Create production configuration
   */
  static createProductionConfig(): AppConfiguration {
    return ConfigurationFactory.createProductionConfig();
  }

  /**
   * Validate configuration data
   */
  static validate(data: unknown) {
    return ConfigurationFactory.validate(data);
  }
}
