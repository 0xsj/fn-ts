import { ZodError } from 'zod';
import {
  configurationSchema,
  AppConfiguration,
  environmentMapping,
  AppConfig,
  DatabaseConfig,
  SecurityConfig,
  ServicesConfig,
  LoggingConfig,
  MonitoringConfig,
} from './configuration.schema';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

export interface ConfigurationOptions {
  environment?: string;
  envFiles?: string[];
  validate?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
}

export interface ConfigurationResult {
  success: boolean;
  config?: AppConfiguration;
  errors?: ZodError;
}

export class ConfigurationFactory {
  private static instance: ConfigurationFactory;
  private cachedConfigurations = new Map<string, AppConfiguration>();

  public static getInstance(): ConfigurationFactory {
    if (!ConfigurationFactory.instance) {
      ConfigurationFactory.instance = new ConfigurationFactory();
    }
    return ConfigurationFactory.instance;
  }

  public static create(options: ConfigurationOptions = {}): AppConfiguration {
    const factory = ConfigurationFactory.getInstance();
    return factory.createConfiguration(options);
  }

  public static createForEnvironment() {}

  public static createFromData() {}

  public static validate() {}

  public static createDevelopmentConfig() {}

  public static createTestConfig() {}

  public static createProductionConfig() {}

  private createConfiguration() {}

  private createFromCustomData() {}

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

  private loadEnvironmentVariables(
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

  private mapEnvironmentToConfig(): any {
    const config: any = {};

    this.initializeConfigStructure(config);

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

  private parseEnvironmentValue(value: string): any {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d*\.\d+$/.test(value)) return parseFloat(value);

    if (value.includes(',')) {
      return value.split(',').map((item) => item.trim());
    }

    return value;
  }

  private formatZodError(error: ZodError): string {
    return error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('\n');
  }

  private getCacheKey(
    environment: string,
    options: ConfigurationOptions,
  ): string {
    return `${environment}_${JSON.stringify(options)}`;
  }

  public clearCache(): void {
    this.cachedConfigurations.clear();
  }

  public getCacheSize(): number {
    return this.cachedConfigurations.size;
  }
}

export function loadConfiguration(): AppConfiguration {
  return ConfigurationFactory.create({
    validate: true,
    stripUnknown: true,
  });
}
