/**
 * Configuration file generator
 * Generates .env files, .env.example, and environment-specific files
 *
 * File: src/config/configuration.generator.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { environmentMapping, AppConfiguration } from './configuration.schema';
import { ConfigurationFactory } from './configuration.factory';

/**
 * Environment file generation options
 */
export interface GenerateEnvOptions {
  outputPath?: string;
  filename?: string;
  includeComments?: boolean;
  includeSecrets?: boolean;
  overwrite?: boolean;
  environment?: string;
}

/**
 * Configuration file generator
 * Generates various environment files from schema or existing config
 */
export class ConfigurationGenerator {
  private static readonly DEFAULT_OUTPUT_PATH = process.cwd();

  /**
   * Generate .env.example file with all possible configuration options
   */
  static generateExample(options: GenerateEnvOptions = {}): string {
    const {
      outputPath = ConfigurationGenerator.DEFAULT_OUTPUT_PATH,
      filename = '.env.example',
      includeComments = true,
      overwrite = true,
    } = options;

    const content =
      ConfigurationGenerator.createExampleContent(includeComments);
    const filePath = path.join(outputPath, filename);

    ConfigurationGenerator.writeFile(filePath, content, overwrite);
    return filePath;
  }

  /**
   * Generate environment-specific .env file
   */
  static generateForEnvironment(
    environment: string,
    options: GenerateEnvOptions = {},
  ): string {
    const {
      outputPath = ConfigurationGenerator.DEFAULT_OUTPUT_PATH,
      filename = `.env.${environment}`,
      includeComments = true,
      includeSecrets = false,
      overwrite = false,
    } = options;

    const config = ConfigurationFactory.createForEnvironment(environment);
    const content = ConfigurationGenerator.createFromConfig(
      config,
      includeComments,
      includeSecrets,
    );
    const filePath = path.join(outputPath, filename);

    ConfigurationGenerator.writeFile(filePath, content, overwrite);
    return filePath;
  }

  /**
   * Generate .env file from existing configuration
   */
  static generateFromConfig(
    config: AppConfiguration,
    options: GenerateEnvOptions = {},
  ): string {
    const {
      outputPath = ConfigurationGenerator.DEFAULT_OUTPUT_PATH,
      filename = '.env',
      includeComments = false,
      includeSecrets = true,
      overwrite = false,
    } = options;

    const content = ConfigurationGenerator.createFromConfig(
      config,
      includeComments,
      includeSecrets,
    );
    const filePath = path.join(outputPath, filename);

    ConfigurationGenerator.writeFile(filePath, content, overwrite);
    return filePath;
  }

  /**
   * Generate development environment file with sensible defaults
   */
  static generateDevelopment(options: GenerateEnvOptions = {}): string {
    return ConfigurationGenerator.generateForEnvironment('development', {
      filename: '.env.development',
      includeComments: true,
      includeSecrets: true,
      overwrite: true,
      ...options,
    });
  }

  /**
   * Generate test environment file
   */
  static generateTest(options: GenerateEnvOptions = {}): string {
    return ConfigurationGenerator.generateForEnvironment('test', {
      filename: '.env.test',
      includeComments: true,
      includeSecrets: false,
      overwrite: true,
      ...options,
    });
  }

  /**
   * Generate production template (without secrets)
   */
  static generateProductionTemplate(options: GenerateEnvOptions = {}): string {
    return ConfigurationGenerator.generateForEnvironment('production', {
      filename: '.env.production.template',
      includeComments: true,
      includeSecrets: false,
      overwrite: true,
      ...options,
    });
  }

  /**
   * Generate all environment files
   */
  static generateAll(outputPath?: string): string[] {
    const generatedFiles: string[] = [];

    // Generate .env.example
    generatedFiles.push(ConfigurationGenerator.generateExample({ outputPath }));

    // Generate environment-specific files
    const environments = ['development', 'test'];
    environments.forEach((env) => {
      generatedFiles.push(
        ConfigurationGenerator.generateForEnvironment(env, { outputPath }),
      );
    });

    // Generate production template
    generatedFiles.push(
      ConfigurationGenerator.generateProductionTemplate({ outputPath }),
    );

    return generatedFiles;
  }

  /**
   * Validate existing .env file against schema
   */
  static validateEnvFile(filePath: string): {
    valid: boolean;
    errors?: string[];
  } {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, errors: ['File does not exist'] };
      }

      // Load the env file
      const envContent = fs.readFileSync(filePath, 'utf8');
      const envVars = ConfigurationGenerator.parseEnvContent(envContent);

      // Set env vars temporarily
      const originalEnv = { ...process.env };
      Object.assign(process.env, envVars);

      try {
        // Try to create configuration
        ConfigurationFactory.create({ validate: true });
        return { valid: true };
      } catch (error) {
        return {
          valid: false,
          errors: [
            error instanceof Error ? error.message : 'Unknown validation error',
          ],
        };
      } finally {
        // Restore original env vars
        process.env = originalEnv;
      }
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Create example content with all possible env vars
   */
  private static createExampleContent(includeComments: boolean): string {
    const examples = {
      // App configuration
      APP_NAME: 'My NestJS App',
      APP_VERSION: '1.0.0',
      NODE_ENV: 'development',
      PORT: '3000',
      HOST: 'localhost',
      API_PREFIX: 'api',
      CORS_ENABLED: 'true',
      CORS_ORIGINS: 'http://localhost:3000,http://localhost:3001',
      CORS_CREDENTIALS: 'true',
      RATE_LIMIT_ENABLED: 'true',
      RATE_LIMIT_WINDOW_MS: '900000',
      RATE_LIMIT_MAX_REQUESTS: '100',

      // Database configuration
      DB_TYPE: 'postgres',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USERNAME: 'postgres',
      DB_PASSWORD: 'password',
      DB_DATABASE: 'myapp',
      DB_SSL: 'false',
      DB_SYNCHRONIZE: 'false',
      DB_LOGGING: 'false',
      DB_MIGRATIONS_RUN: 'true',
      DB_MAX_CONNECTIONS: '10',
      DB_CONNECTION_TIMEOUT: '30000',

      // Security configuration
      JWT_SECRET: 'your-super-secret-jwt-key-minimum-32-characters',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      JWT_ISSUER: 'my-nestjs-app',
      JWT_AUDIENCE: 'my-nestjs-app',
      BCRYPT_ROUNDS: '12',
      SESSION_SECRET: 'your-super-secret-session-key-minimum-32-characters',
      SESSION_MAX_AGE: '86400000',

      // Services configuration
      REDIS_ENABLED: 'false',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: '',
      REDIS_DB: '0',
      REDIS_TTL: '3600',

      EMAIL_ENABLED: 'false',
      EMAIL_PROVIDER: 'smtp',
      EMAIL_FROM: 'noreply@example.com',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
      SMTP_USER: 'your-smtp-username',
      SMTP_PASS: 'your-smtp-password',

      STORAGE_PROVIDER: 'local',
      STORAGE_UPLOAD_PATH: './uploads',
      STORAGE_MAX_FILE_SIZE: '10485760',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'my-app-bucket',
      S3_ACCESS_KEY_ID: 'your-access-key-id',
      S3_SECRET_ACCESS_KEY: 'your-secret-access-key',

      // Logging configuration
      LOG_LEVEL: 'info',
      LOG_FORMAT: 'json',
      LOG_FILE_ENABLED: 'true',
      LOG_FILE_PATH: './logs',
      LOG_FILE_MAX_SIZE: '20m',
      LOG_FILE_MAX_FILES: '5',
      LOG_CONSOLE_ENABLED: 'true',
      LOG_CONSOLE_COLORIZE: 'true',

      // Monitoring configuration
      HEALTH_ENABLED: 'true',
      HEALTH_ENDPOINT: '/health',
      METRICS_ENABLED: 'false',
      METRICS_ENDPOINT: '/metrics',
      SWAGGER_ENABLED: 'true',
      SWAGGER_PATH: 'docs',
      SWAGGER_TITLE: 'My NestJS API',
      SWAGGER_DESCRIPTION: 'API Documentation',
      SWAGGER_VERSION: '1.0.0',
    };

    const comments = {
      APP_NAME: 'Application name displayed in logs and documentation',
      NODE_ENV: 'Environment: development, staging, production, test',
      DB_PASSWORD: 'Database password (keep secure!)',
      JWT_SECRET: 'JWT secret key (minimum 32 characters, keep secure!)',
      SESSION_SECRET:
        'Session secret key (minimum 32 characters, keep secure!)',
    };

    let content = '# Environment Configuration\n';
    content += '# Copy this file to .env and modify the values\n\n';

    // Group by section
    const sections = {
      'App Configuration': [
        'APP_NAME',
        'APP_VERSION',
        'NODE_ENV',
        'PORT',
        'HOST',
        'API_PREFIX',
        'CORS_ENABLED',
        'CORS_ORIGINS',
        'CORS_CREDENTIALS',
        'RATE_LIMIT_ENABLED',
        'RATE_LIMIT_WINDOW_MS',
        'RATE_LIMIT_MAX_REQUESTS',
      ],
      'Database Configuration': [
        'DB_TYPE',
        'DB_HOST',
        'DB_PORT',
        'DB_USERNAME',
        'DB_PASSWORD',
        'DB_DATABASE',
        'DB_SSL',
        'DB_SYNCHRONIZE',
        'DB_LOGGING',
        'DB_MIGRATIONS_RUN',
        'DB_MAX_CONNECTIONS',
        'DB_CONNECTION_TIMEOUT',
      ],
      'Security Configuration': [
        'JWT_SECRET',
        'JWT_EXPIRES_IN',
        'JWT_REFRESH_EXPIRES_IN',
        'JWT_ISSUER',
        'JWT_AUDIENCE',
        'BCRYPT_ROUNDS',
        'SESSION_SECRET',
        'SESSION_MAX_AGE',
      ],
      'Redis Configuration': [
        'REDIS_ENABLED',
        'REDIS_HOST',
        'REDIS_PORT',
        'REDIS_PASSWORD',
        'REDIS_DB',
        'REDIS_TTL',
      ],
      'Email Configuration': [
        'EMAIL_ENABLED',
        'EMAIL_PROVIDER',
        'EMAIL_FROM',
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_SECURE',
        'SMTP_USER',
        'SMTP_PASS',
      ],
      'Storage Configuration': [
        'STORAGE_PROVIDER',
        'STORAGE_UPLOAD_PATH',
        'STORAGE_MAX_FILE_SIZE',
        'S3_REGION',
        'S3_BUCKET',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
      ],
      'Logging Configuration': [
        'LOG_LEVEL',
        'LOG_FORMAT',
        'LOG_FILE_ENABLED',
        'LOG_FILE_PATH',
        'LOG_FILE_MAX_SIZE',
        'LOG_FILE_MAX_FILES',
        'LOG_CONSOLE_ENABLED',
        'LOG_CONSOLE_COLORIZE',
      ],
      'Monitoring Configuration': [
        'HEALTH_ENABLED',
        'HEALTH_ENDPOINT',
        'METRICS_ENABLED',
        'METRICS_ENDPOINT',
        'SWAGGER_ENABLED',
        'SWAGGER_PATH',
        'SWAGGER_TITLE',
        'SWAGGER_DESCRIPTION',
        'SWAGGER_VERSION',
      ],
    };

    Object.entries(sections).forEach(([sectionName, keys]) => {
      content += `# ${sectionName}\n`;
      keys.forEach((key) => {
        if (includeComments && comments[key]) {
          content += `# ${comments[key]}\n`;
        }
        content += `${key}=${examples[key]}\n`;
      });
      content += '\n';
    });

    return content;
  }

  /**
   * Create content from existing configuration
   */
  private static createFromConfig(
    config: AppConfiguration,
    includeComments: boolean,
    includeSecrets: boolean,
  ): string {
    const envVars: Record<string, string> = {};

    // Map config back to env vars
    Object.entries(environmentMapping).forEach(([envKey, configPath]) => {
      const value = ConfigurationGenerator.getNestedValue(config, configPath);
      if (value !== undefined) {
        // Handle sensitive values
        if (!includeSecrets && ConfigurationGenerator.isSensitiveKey(envKey)) {
          envVars[envKey] = 'CHANGE_ME';
        } else {
          envVars[envKey] = ConfigurationGenerator.formatValue(value);
        }
      }
    });

    let content = includeComments
      ? `# Environment Configuration for ${config.app.environment}\n# Generated at ${new Date().toISOString()}\n\n`
      : '';

    Object.entries(envVars).forEach(([key, value]) => {
      content += `${key}=${value}\n`;
    });

    return content;
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Format value for env file
   */
  private static formatValue(value: any): string {
    if (Array.isArray(value)) {
      return value.join(',');
    }
    return String(value);
  }

  /**
   * Check if environment key is sensitive
   */
  private static isSensitiveKey(key: string): boolean {
    const sensitiveKeys = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'PASS'];
    return sensitiveKeys.some((sensitive) => key.includes(sensitive));
  }

  /**
   * Write file with error handling
   */
  private static writeFile(
    filePath: string,
    content: string,
    overwrite: boolean,
  ): void {
    if (fs.existsSync(filePath) && !overwrite) {
      throw new Error(
        `File ${filePath} already exists. Use overwrite: true to replace it.`,
      );
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Generated: ${filePath}`);
  }

  /**
   * Parse .env file content into object
   */
  private static parseEnvContent(content: string): Record<string, string> {
    const envVars: Record<string, string> = {};

    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=');
        }
      }
    });

    return envVars;
  }
}
