// src/infrastructure/monitoring/logging/logger.impl.ts
import { ILogger, LogContext, LogEntry, LogLevel, LoggerTransport } from './types';
import { RequestContext } from '../../../shared/context/request-context';

export class Logger implements ILogger {
  private readonly context: LogContext;
  private readonly transports: LoggerTransport[];
  private readonly level: LogLevel;

  constructor(
    context: LogContext = {},
    transports: LoggerTransport[] = [],
    level: LogLevel = 'info'
  ) {
    this.context = context;
    this.transports = transports;
    this.level = level;
  }

  // Fatal overloads
  fatal(message: string, data?: Record<string, unknown>): void;
  fatal(error: Error, message: string, data?: Record<string, unknown>): void;
  fatal(messageOrError: string | Error, messageOrData?: string | Record<string, unknown>, data?: Record<string, unknown>): void {
    this.log('fatal', messageOrError, messageOrData, data);
  }

  // Error overloads
  error(message: string, data?: Record<string, unknown>): void;
  error(error: Error, message: string, data?: Record<string, unknown>): void;
  error(messageOrError: string | Error, messageOrData?: string | Record<string, unknown>, data?: Record<string, unknown>): void {
    this.log('error', messageOrError, messageOrData, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, undefined, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, undefined, data);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, undefined, data);
  }

  trace(message: string, data?: Record<string, unknown>): void {
    this.log('trace', message, undefined, data);
  }

  child(context: LogContext): ILogger {
    return new Logger(
      { ...this.context, ...context },
      this.transports,
      this.level
    );
  }

  setContext(context: LogContext): void {
    Object.assign(this.context, context);
  }

  withRequest(requestContext: RequestContext): ILogger {
    return this.child({
      correlationId: requestContext.correlationId,
      userId: requestContext.getMetadata('userId') as string,
      tenantId: requestContext.getMetadata('tenantId') as string,
      path: requestContext.path,
      method: requestContext.method,
    });
  }

  private log(
    level: LogLevel,
    messageOrError: string | Error,
    messageOrData?: string | Record<string, unknown>,
    data?: Record<string, unknown>
  ): void {
    let message: string;
    let error: Error | undefined;
    let logData: Record<string, unknown> | undefined;

    // Parse overloaded parameters
    if (messageOrError instanceof Error) {
      error = messageOrError;
      message = typeof messageOrData === 'string' ? messageOrData : error.message;
      logData = typeof messageOrData === 'object' ? messageOrData : data;
    } else {
      message = messageOrError;
      logData = messageOrData as Record<string, unknown>;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: { ...this.context },
      error,
      data: logData,
    };

    // Send to all transports
    for (const transport of this.transports) {
      if (transport.isReady()) {
        transport.log(entry).catch(err => {
          console.error(`Transport ${transport.name} failed:`, err);
        });
      }
    }
  }

  async flush(): Promise<void> {
    await Promise.all(
      this.transports.map(transport =>
        transport.flush?.().catch(err => {
          console.error(`Failed to flush transport ${transport.name}:`, err);
        })
      )
    );
  }

  async close(): Promise<void> {
    await Promise.all(
      this.transports.map(transport =>
        transport.close?.().catch(err => {
          console.error(`Failed to close transport ${transport.name}:`, err);
        })
      )
    );
  }
}