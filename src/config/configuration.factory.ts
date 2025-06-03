/**
 * Configuration Factory using Factory pattern with Zod validation
 * Creates configuration instances for different environments and use cases
 *
 * File: src/config/configuration.factory.ts
 */

import { ZodError } from 'zod';
import {
  configurationSchema,
  AppConfiguration,
  environmentMapping,
} from './configuration.schema';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Configuration creation options
 */
export interface ConfigurationOptions {
  environment?: string;
  envFiles?: string[];
  validate?: boolean;
}

/**
 * Configuration validation result
 */
export interface ConfigurationResult {
  success: boolean;
  config?: AppConfiguration;
  errors?: ZodError;
}

/**
 * Configuration Factory implementing Factory pattern
 * Responsible for creating and validating configuration instances
 */
export class ConfigurationFactory {
  private static instance: ConfigurationFactory;
  private cachedConfigurations = new Map<string, AppConfiguration>();

  /**
   * Singleton pattern - get factory instance
   */
  public static getInstance(): ConfigurationFactory {
    if (!ConfigurationFactory.instance) {
      ConfigurationFactory.instance = new ConfigurationFactory();
    }
    return ConfigurationFactory.instance;
  }

  /**
   * Main factory method - create configuration for current environment
   */
  public static create(options: ConfigurationOptions = {}): AppConfiguration {
    const factory = ConfigurationFactory.getInstance();
    return factory.createConfiguration(options);
  }

  /**
   * Create configuration for specific environment
   */
  public static createForEnvironment(
    environment: string,
    options: ConfigurationOptions = {},
  ): AppConfiguration {
    const factory = ConfigurationFactory.getInstance();
    return factory.createConfiguration({
      ...options,
      environment,
    });
  }

  /**
   * Create configuration from custom data (useful for testing)
   */
  public static createFromData(
    data: Partial<AppConfiguration>,
  ): AppConfiguration {
    const factory = ConfigurationFactory.getInstance();
    return factory.createFromCustomData(data);
  }

  /**
   * Validate configuration without creating instance
   */
  public static validate(data: unknown): ConfigurationResult {
    const factory = ConfigurationFactory.getInstance();
    return factory.validateConfiguration(data);
  }

  /**
   * Create development configuration with sensible defaults
   */
  public static createDevelopmentConfig(): AppConfiguration {
    return ConfigurationFactory.createForEnvironment('development');
  }

  /**
   * Create test configuration with test-specific settings
   */
  public static createTestConfig(): AppConfiguration {
    const testConfig = ConfigurationFactory.createForEnvironment('test');

    // Override specific test settings
    return {
      ...testConfig,
      database: {
        ...testConfig.database,
        database: `${testConfig.database.database}_test`,
        synchronize: true,
        logging: false,
      },
      logging: {
        ...testConfig.logging,
        level: 'error',
        console: {
          enabled: false,
          colorize: false,
        },
        file: {
          enabled: false,
          path: './logs',
          maxSize: '20m',
          maxFiles: 5,
        },
      },
    };
  }

  /**
   * Create production configuration with strict validation
   */
  public static createProductionConfig(): AppConfiguration {
    const config = ConfigurationFactory.createForEnvironment('production');

    // Additional production validations
    if (config.database.synchronize) {
      throw new Error(
        'Database synchronization must be disabled in production',
      );
    }

    if (config.app.environment !== 'production') {
      throw new Error('Environment must be set to production');
    }

    return config;
  }

  // ============================================================================
  // Instance Methods
  // ============================================================================

  /**
   * Create configuration instance
   */
  private createConfiguration(options: ConfigurationOptions): AppConfiguration {
    const {
      environment = process.env.NODE_ENV || 'development',
      validate = true,
    } = options;

    // Check cache first
    const cacheKey = this.getCacheKey(environment, options);
    if (this.cachedConfigurations.has(cacheKey)) {
      return this.cachedConfigurations.get(cacheKey)!;
    }

    // Load environment files
    this.loadEnvironmentFiles(environment, options.envFiles);

    // Map environment variables to configuration object
    const configData = this.mapEnvironmentToConfig();

    // Validate if requested
    if (validate) {
      const result = this.validateConfiguration(configData);
      if (!result.success) {
        throw new Error(
          `Configuration validation failed:\n${this.formatZodError(result.errors!)}`,
        );
      }

      // Cache and return validated config
      this.cachedConfigurations.set(cacheKey, result.config!);
      return result.config!;
    }

    // Return unvalidated config (not recommended)
    return configData as AppConfiguration;
  }

  /**
   * Create configuration from custom data
   */
  private createFromCustomData(
    data: Partial<AppConfiguration>,
  ): AppConfiguration {
    const result = configurationSchema.safeParse(data);

    if (!result.success) {
      throw new Error(
        `Configuration validation failed:\n${this.formatZodError(result.error)}`,
      );
    }

    return result.data;
  }

  /**
   * Validate configuration data
   */
  private validateConfiguration(data: unknown): ConfigurationResult {
    const result = configurationSchema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        config: result.data,
      };
    }

    return {
      success: false,
      errors: result.error,
    };
  }

  /**
   * Load environment files in order of precedence
   */
  private loadEnvironmentFiles(
    environment: string,
    customFiles?: string[],
  ): void {
    const envPath = path.resolve(process.cwd());

    const defaultFiles = [
      path.join(envPath, '.env'),
      path.join(envPath, `.env.${environment}`),
      path.join(envPath, '.env.local'),
    ];

    const filesToLoad = customFiles || defaultFiles;

    filesToLoad.forEach((file) => {
      if (fs.existsSync(file)) {
        dotenv.config({ path: file, override: false });
      }
    });
  }

  /**
   * Map environment variables to configuration object structure
   */
  private mapEnvironmentToConfig(): any {
    const config: any = {};

    // Initialize nested structure
    this.initializeConfigStructure(config);

    // Map environment variables
    Object.entries(environmentMapping).forEach(([envKey, configPath]) => {
      const envValue = process.env[envKey];
      if (envValue !== undefined) {
        this.setNestedValue(
          config,
          configPath,
          this.parseEnvironmentValue(envValue),
        );
      }
    });

    return config;
  }

  /**
   * Initialize the nested configuration structure
   */
  private initializeConfigStructure(config: any): void {
    config.app = {
      cors: {},
      rateLimit: {},
    };
    config.database = {};
    config.security = {
      jwt: {},
      bcrypt: {},
      session: {},
    };
    config.services = {
      redis: {},
      email: {
        smtp: {
          auth: {},
        },
      },
      storage: {
        local: {},
        s3: {},
      },
    };
    config.logging = {
      file: {},
      console: {},
    };
    config.monitoring = {
      health: {},
      metrics: {},
      swagger: {},
    };
  }

  /**
   * Set a nested value in an object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Parse environment variable value to appropriate type
   */
  private parseEnvironmentValue(value: string): any {
    // Handle boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Handle numeric values
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d*\.\d+$/.test(value)) return parseFloat(value);

    // Handle array values (comma-separated)
    if (value.includes(',')) {
      return value.split(',').map((item) => item.trim());
    }

    // Return as string
    return value;
  }

  /**
   * Format Zod error for human-readable output
   */
  private formatZodError(error: ZodError): string {
    return error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('\n');
  }

  /**
   * Generate cache key for configuration
   */
  private getCacheKey(
    environment: string,
    options: ConfigurationOptions,
  ): string {
    return `${environment}_${JSON.stringify(options)}`;
  }

  /**
   * Clear configuration cache
   */
  public clearCache(): void {
    this.cachedConfigurations.clear();
  }

  /**
   * Get cached configuration count (for debugging)
   */
  public getCacheSize(): number {
    return this.cachedConfigurations.size;
  }
}

/**
 * Convenience function for NestJS ConfigModule
 */
export function loadConfiguration(): AppConfiguration {
  return ConfigurationFactory.create({
    validate: true,
  });
}
