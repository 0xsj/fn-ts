import { z } from 'zod';

const appConfigSchema = z.object({
  name: z.string().default('NestJS App'),
  version: z.string().default('1.0.0'),
  environment: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  port: z.number().min(1).max(65535).default(3000),
  host: z.string().default('localhost'),
  apiPrefix: z.string().default('api'),
  cors: z.object({
    enabled: z.boolean().default(true),
    origins: z.array(z.string()).default(['http://localhost:3000']),
    credentials: z.boolean().default(true),
  }),
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    windowMs: z.number().default(15 * 60 * 1000),
    maxRequests: z.number().default(100),
  }),
});

const databaseConfigSchema = z.object({
  type: z.enum(['postgres', 'mysql', 'sqlite']).default('postgres'),
  host: z.string().default('localhost'),
  port: z.number().min(1).max(65535).default(5432),
  username: z.string().min(1),
  password: z.string().min(1),
  database: z.string().min(1),
  ssl: z.boolean().default(false),
  synchronize: z.boolean().default(false),
  logging: z.boolean().default(false),
  migrationsRun: z.boolean().default(false),
  maxConnections: z.number().min(1).default(10),
  connectionTimeout: z.number().min(1000).default(30000),
});

const securityConfigSchema = z.object({
  jwt: z.object({
    secret: z.string().min(32),
    expiresIn: z.string().default('15m'),
    refreshExpiresIn: z.string().default('7d'),
    issuer: z.string().default('nestjs-app'),
    audience: z.string().default('nestjs-app'),
  }),
  bcrypt: z.object({
    rounds: z.number().min(10).max(15).default(12),
  }),
  session: z.object({
    secret: z.string().min(32),
    maxAge: z.number().default(24 * 60 * 60 * 1000), // 24 hours
  }),
});

const servicesConfigSchema = z.object({
  redis: z.object({
    enabled: z.boolean().default(false),
    host: z.string().default('localhost'),
    port: z.number().min(1).max(65535).default(6379),
    password: z.string().optional(),
    db: z.number().min(0).default(0),
    ttl: z.number().min(1).default(3600), // 1 hour
  }),
  email: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['smtp', 'sendgrid', 'ses']).default('smtp'),
    smtp: z
      .object({
        host: z.string(),
        port: z.number().min(1).max(65535),
        secure: z.boolean().default(false),
        auth: z.object({
          user: z.string(),
          pass: z.string(),
        }),
      })
      .optional(),
    from: z.string().email(),
  }),
  storage: z.object({
    provider: z.enum(['local', 's3', 'gcs']).default('local'),
    local: z
      .object({
        uploadPath: z.string().default('./uploads'),
        maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB
      })
      .optional(),
    s3: z
      .object({
        region: z.string(),
        bucket: z.string(),
        accessKeyId: z.string(),
        secretAccessKey: z.string(),
      })
      .optional(),
  }),
});

const loggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
  format: z.enum(['json', 'simple']).default('json'),
  file: z.object({
    enabled: z.boolean().default(true),
    path: z.string().default('./logs'),
    maxSize: z.string().default('20m'),
    maxFiles: z.number().default(5),
  }),
  console: z.object({
    enabled: z.boolean().default(true),
    colorize: z.boolean().default(true),
  }),
});

const monitoringConfigSchema = z.object({
  health: z.object({
    enabled: z.boolean().default(true),
    endpoint: z.string().default('/health'),
  }),
  metrics: z.object({
    enabled: z.boolean().default(false),
    endpoint: z.string().default('/metrics'),
  }),
  swagger: z.object({
    enabled: z.boolean().default(true),
    path: z.string().default('docs'),
    title: z.string().default('NestJS API'),
    description: z.string().default('API Documentation'),
    version: z.string().default('1.0.0'),
  }),
});

export const configurationSchema = z.object({
  app: appConfigSchema,
  database: databaseConfigSchema,
  security: securityConfigSchema,
  services: servicesConfigSchema,
  logging: loggingConfigSchema,
  monitoring: monitoringConfigSchema,
});

export type AppConfiguration = z.infer<typeof configurationSchema>;

export type AppConfig = z.infer<typeof appConfigSchema>;
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
export type SecurityConfig = z.infer<typeof securityConfigSchema>;
export type ServicesConfig = z.infer<typeof servicesConfigSchema>;
export type LoggingConfig = z.infer<typeof loggingConfigSchema>;
export type MonitoringConfig = z.infer<typeof monitoringConfigSchema>;

export const environmentMapping = {
  // App configuration
  APP_NAME: 'app.name',
  APP_VERSION: 'app.version',
  NODE_ENV: 'app.environment',
  PORT: 'app.port',
  HOST: 'app.host',
  API_PREFIX: 'app.apiPrefix',
  CORS_ENABLED: 'app.cors.enabled',
  CORS_ORIGINS: 'app.cors.origins',
  CORS_CREDENTIALS: 'app.cors.credentials',
  RATE_LIMIT_ENABLED: 'app.rateLimit.enabled',
  RATE_LIMIT_WINDOW_MS: 'app.rateLimit.windowMs',
  RATE_LIMIT_MAX_REQUESTS: 'app.rateLimit.maxRequests',

  // Database configuration
  DB_TYPE: 'database.type',
  DB_HOST: 'database.host',
  DB_PORT: 'database.port',
  DB_USERNAME: 'database.username',
  DB_PASSWORD: 'database.password',
  DB_DATABASE: 'database.database',
  DB_SSL: 'database.ssl',
  DB_SYNCHRONIZE: 'database.synchronize',
  DB_LOGGING: 'database.logging',
  DB_MIGRATIONS_RUN: 'database.migrationsRun',
  DB_MAX_CONNECTIONS: 'database.maxConnections',
  DB_CONNECTION_TIMEOUT: 'database.connectionTimeout',

  // Security configuration
  JWT_SECRET: 'security.jwt.secret',
  JWT_EXPIRES_IN: 'security.jwt.expiresIn',
  JWT_REFRESH_EXPIRES_IN: 'security.jwt.refreshExpiresIn',
  JWT_ISSUER: 'security.jwt.issuer',
  JWT_AUDIENCE: 'security.jwt.audience',
  BCRYPT_ROUNDS: 'security.bcrypt.rounds',
  SESSION_SECRET: 'security.session.secret',
  SESSION_MAX_AGE: 'security.session.maxAge',

  // Services configuration
  REDIS_ENABLED: 'services.redis.enabled',
  REDIS_HOST: 'services.redis.host',
  REDIS_PORT: 'services.redis.port',
  REDIS_PASSWORD: 'services.redis.password',
  REDIS_DB: 'services.redis.db',
  REDIS_TTL: 'services.redis.ttl',

  EMAIL_ENABLED: 'services.email.enabled',
  EMAIL_PROVIDER: 'services.email.provider',
  EMAIL_FROM: 'services.email.from',
  SMTP_HOST: 'services.email.smtp.host',
  SMTP_PORT: 'services.email.smtp.port',
  SMTP_SECURE: 'services.email.smtp.secure',
  SMTP_USER: 'services.email.smtp.auth.user',
  SMTP_PASS: 'services.email.smtp.auth.pass',

  STORAGE_PROVIDER: 'services.storage.provider',
  STORAGE_UPLOAD_PATH: 'services.storage.local.uploadPath',
  STORAGE_MAX_FILE_SIZE: 'services.storage.local.maxFileSize',
  S3_REGION: 'services.storage.s3.region',
  S3_BUCKET: 'services.storage.s3.bucket',
  S3_ACCESS_KEY_ID: 'services.storage.s3.accessKeyId',
  S3_SECRET_ACCESS_KEY: 'services.storage.s3.secretAccessKey',

  // Logging configuration
  LOG_LEVEL: 'logging.level',
  LOG_FORMAT: 'logging.format',
  LOG_FILE_ENABLED: 'logging.file.enabled',
  LOG_FILE_PATH: 'logging.file.path',
  LOG_FILE_MAX_SIZE: 'logging.file.maxSize',
  LOG_FILE_MAX_FILES: 'logging.file.maxFiles',
  LOG_CONSOLE_ENABLED: 'logging.console.enabled',
  LOG_CONSOLE_COLORIZE: 'logging.console.colorize',

  // Monitoring configuration
  HEALTH_ENABLED: 'monitoring.health.enabled',
  HEALTH_ENDPOINT: 'monitoring.health.endpoint',
  METRICS_ENABLED: 'monitoring.metrics.enabled',
  METRICS_ENDPOINT: 'monitoring.metrics.endpoint',
  SWAGGER_ENABLED: 'monitoring.swagger.enabled',
  SWAGGER_PATH: 'monitoring.swagger.path',
  SWAGGER_TITLE: 'monitoring.swagger.title',
  SWAGGER_DESCRIPTION: 'monitoring.swagger.description',
  SWAGGER_VERSION: 'monitoring.swagger.version',
} as const;
