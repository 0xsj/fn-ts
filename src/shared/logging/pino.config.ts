import pino from 'pino';
import { ConfigurationService } from 'src/config';

export interface PinoConfig {
  level: string;
  formatters: {
    level: (label: string) => { level: string };
    bindings: (bindings: pino.Bindings) => Record<string, any>;
  };
  timestamp: () => string;
  base: Record<string, any>;
  serializers: Record<string, pino.SerializerFn>;
  redact: string[];
  transport?: pino.TransportSingleOptions | pino.TransportMultiOptions;
}

export function createPinoConfig(config: ConfigurationService): PinoConfig {
  const loggingConfig = config.logging;
  const appConfig = config.app;
  const isDevelopment = config.isDevelopment;
  const isProduction = config.isProduction;

  const baseConfig: PinoConfig = {
    level: loggingConfig.level,

    // Custom formatters
    formatters: {
      level: (label: string) => ({ level: label }),
      bindings: (bindings: pino.Bindings) => ({
        pid: bindings.pid,
        hostname: bindings.hostname,
        service: appConfig.name,
        version: appConfig.version,
        environment: appConfig.environment,
      }),
    },

    // ISO timestamp
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,

    // Base fields added to every log
    base: {
      service: appConfig.name,
      version: appConfig.version,
      environment: appConfig.environment,
    },

    // Custom serializers for complex objects
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,

      user: (user: any) => {
        if (!user) return user;
        // const { _password, _refreshToken, ...safeUser } = user;
        const { ...safeUser } = user;
        return safeUser;
      },

      // Custom database query serializer
      query: (query: any) => {
        if (!query) return query;
        return {
          sql: query.sql,
          parameters: query.parameters,
          duration: query.duration,
        };
      },

      // HTTP request context
      httpContext: (context: any) => {
        if (!context) return context;
        return {
          method: context.method,
          url: context.url,
          userAgent: context.userAgent,
          ip: context.ip,
          correlationId: context.correlationId,
        };
      },
    },

    // Redact sensitive fields from logs
    redact: [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'refreshToken',
      'accessToken',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.secret',
      '*.token',
      '*.key',
    ],
  };

  // Development-specific configuration
  if (isDevelopment && loggingConfig.console.enabled) {
    baseConfig.transport = {
      target: 'pino-pretty',
      options: {
        colorize: loggingConfig.console.colorize,
        levelFirst: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
        hideObject: false,
        customPrettifiers: {
          correlationId: (correlationId: string) => `[${correlationId}]`,
          userId: (userId: string) => `user:${userId}`,
          duration: (duration: number) => `${duration}ms`,
        },
      },
    };
  }

  // Production file logging with rotation
  if (isProduction && loggingConfig.file.enabled) {
    baseConfig.transport = {
      targets: [
        // JSON logs for production analysis
        {
          target: 'pino/file',
          level: loggingConfig.level,
          options: {
            destination: `${loggingConfig.file.path}/app.log`,
          },
        },
        // Error-only logs
        {
          target: 'pino/file',
          level: 'error',
          options: {
            destination: `${loggingConfig.file.path}/error.log`,
          },
        },
      ],
    };
  }

  // Multiple transports for staging/development with file logging
  if (
    !isProduction &&
    loggingConfig.file.enabled &&
    loggingConfig.console.enabled
  ) {
    baseConfig.transport = {
      targets: [
        // Pretty console output
        {
          target: 'pino-pretty',
          level: loggingConfig.level,
          options: {
            colorize: loggingConfig.console.colorize,
            levelFirst: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
        // JSON file output
        {
          target: 'pino/file',
          level: loggingConfig.level,
          options: {
            destination: `${loggingConfig.file.path}/app.log`,
          },
        },
      ],
    };
  }

  return baseConfig;
}

export function createDevelopmentPinoConfig(): PinoConfig {
  return {
    level: 'debug',
    formatters: {
      level: (label: string) => ({ level: label }),
      bindings: () => ({}),
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    base: {},
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
    redact: ['password', 'secret', 'token'],
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  };
}

export function createTestPinoConfig(): PinoConfig {
  return {
    level: 'silent', // No logs during tests
    formatters: {
      level: (label: string) => ({ level: label }),
      bindings: () => ({}),
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    base: {},
    serializers: {},
    redact: [],
  };
}

export const LOG_LEVELS = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;
