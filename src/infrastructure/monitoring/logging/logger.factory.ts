// src/infrastructure/monitoring/logging/logger.factory.ts
import pino, { Logger as PinoLogger, LoggerOptions as PinoOptions } from 'pino';
import { config } from '../../../core/config';
import type { RequestContext } from '../../../shared/context/request-context';

// Define transport targets type
interface TransportTarget {
  target: string;
  options?: Record<string, any>;
  level?: string;
}

interface TransportMultiOptions {
  targets: TransportTarget[];
}

interface TransportSingleOptions {
  target: string;
  options?: Record<string, any>;
}

// Extend Pino logger with our custom methods
export interface ILogger extends PinoLogger {
  withRequest(context: RequestContext): ILogger;
}

export class LoggerFactory {
  private static instance: LoggerFactory;
  private readonly baseLogger: PinoLogger;
  private readonly loggers: Map<string, ILogger> = new Map();

  private constructor() {
    this.baseLogger = this.createBaseLogger();
  }

  static getInstance(): LoggerFactory {
    if (!LoggerFactory.instance) {
      LoggerFactory.instance = new LoggerFactory();
    }
    return LoggerFactory.instance;
  }

  private createBaseLogger(): PinoLogger {
    const isProduction = config.app.env === 'production';
    const isDevelopment = config.app.env === 'development';

    const baseOptions: PinoOptions = {
      level: config.app.logging.level || 'info',

      // Base context
      base: {
        pid: process.pid,
        hostname: process.env.HOSTNAME,
        service: config.app.name,
        version: config.app.version,
        environment: config.app.env,
      },

      // Redact sensitive fields
      redact: {
        paths: [
          'password',
          'passwordHash',
          'authorization',
          'cookie',
          'req.headers.authorization',
          'req.headers.cookie',
          '*.password',
          '*.passwordHash',
          '*.token',
          '*.apiKey',
          '*.secret',
        ],
        censor: '[REDACTED]',
      },

      // Serializers
      serializers: {
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
      },

      // Format options
      formatters: {
        level: (label) => {
          return { level: label };
        },
        bindings: (bindings) => {
          return {
            ...bindings,
            pid: bindings.pid,
            host: bindings.hostname,
          };
        },
      },

      // Timestamp
      timestamp: pino.stdTimeFunctions.isoTime,

      // Custom error serializer hook
      hooks: {
        logMethod(inputArgs: any[], method: any) {
          // Check if first argument is an Error instance
          if (inputArgs.length > 0 && inputArgs[0] && inputArgs[0] instanceof Error) {
            const error = inputArgs[0] as Error;
            return method.apply(this, [
              {
                err: error,
                msg: inputArgs[1] || error.message,
                ...inputArgs[2],
              },
            ]);
          }
          return method.apply(this, inputArgs);
        },
      },
    };

    // Development pretty printing
    if (isDevelopment) {
      const devOptions: PinoOptions = {
        ...baseOptions,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
            messageFormat: '{msg} {req.method} {req.url}',
          },
        } as TransportSingleOptions,
      };
      return pino(devOptions);
    }

    // Production setup with multiple transports
    if (isProduction) {
      const targets: TransportTarget[] = [
        // Console transport (stdout)
        {
          target: 'pino/file',
          options: { destination: 1 }, // stdout
        },
      ];

      // File transport if enabled
      if (process.env.ENABLE_FILE_LOGGING === 'true') {
        targets.push({
          target: 'pino-roll',
          options: {
            file: process.env.LOG_FILE || './logs/app.log',
            size: '10m',
            frequency: 'daily',
            dateFormat: 'YYYY-MM-DD',
            mkdir: true,
          },
        });
      }

      // Elasticsearch transport (placeholder for when implemented)
      if (process.env.ENABLE_ELASTICSEARCH_LOGGING === 'true') {
        targets.push({
          target: './transports/pino-elasticsearch.js',
          options: {
            node: config.elasticsearch.node,
            index: 'logs',
            type: 'log',
          },
        });
      }

      const prodOptions: PinoOptions = {
        ...baseOptions,
        transport: {
          targets: targets,
        } as TransportMultiOptions,
      };
      return pino(prodOptions);
    }

    // Default logger (for test environment, etc.)
    return pino(baseOptions);
  }

  /**
   * Get or create a logger for a specific module
   */
  getLogger(module?: string): ILogger {
    if (!module) {
      return this.enhanceLogger(this.baseLogger);
    }

    if (!this.loggers.has(module)) {
      const childLogger = this.baseLogger.child({ module });
      this.loggers.set(module, this.enhanceLogger(childLogger));
    }

    return this.loggers.get(module)!;
  }

  /**
   * Enhance Pino logger with custom methods
   */
  private enhanceLogger(logger: PinoLogger): ILogger {
    const enhanced = logger as ILogger;

    // Add withRequest method
    enhanced.withRequest = function (this: PinoLogger, context: RequestContext): ILogger {
      const childLogger = this.child({
        correlationId: context.correlationId,
        userId: context.getMetadata('userId'),
        tenantId: context.getMetadata('tenantId'),
        path: context.path,
        method: context.method,
      });
      return enhanceLogger(childLogger);
    };

    return enhanced;

    function enhanceLogger(l: PinoLogger): ILogger {
      const e = l as ILogger;
      e.withRequest = enhanced.withRequest.bind(l);
      return e;
    }
  }

  /**
   * Create a logger with custom configuration
   */
  createCustomLogger(options: PinoOptions): ILogger {
    return this.enhanceLogger(pino(options));
  }

  /**
   * Update global context
   */
  setGlobalContext(context: Record<string, any>): void {
    this.baseLogger.setBindings(context);
  }

  /**
   * Flush logs (Pino handles this automatically in most cases)
   */
  async flush(): Promise<void> {
    // Pino automatically flushes on process exit
    // This is here for manual flush if needed
    if ('flush' in this.baseLogger) {
      (this.baseLogger as any).flush();
    }
  }
}

export const loggerFactory = LoggerFactory.getInstance();
