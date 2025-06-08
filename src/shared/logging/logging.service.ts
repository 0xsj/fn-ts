import { Injectable, Scope } from '@nestjs/common';
import pino, { Logger as PinoLogger } from 'pino';
import { ConfigurationService } from 'src/config';
import {
  createPinoConfig,
  createDevelopmentPinoConfig,
  createTestPinoConfig,
} from './pino.config';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  action?: string;
  resource?: string;
  metadata?: Record<string, any>;
  duration?: number;
  [key: string]: any;
}

export interface ErrorLogContext extends LogContext {
  error?: Error;
  stack?: string;
  statusCode?: number;
}

export interface HttpLogContext extends LogContext {
  method?: string;
  url?: string;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
  responseTime?: number;
}

export interface DatabaseLogContext extends LogContext {
  query?: string;
  parameters?: any[];
  executionTime?: number;
  affectedRows?: number;
}

export interface BusinessLogContext extends LogContext {
  entityType?: string;
  entityId?: string;
  operation?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

@Injectable({ scope: Scope.REQUEST })
export class LoggingService {
  private readonly logger: PinoLogger;
  private correlationId?: string;
  private userId?: string;
  private readonly baseContext: Record<string, any> = {};

  constructor(private readonly config: ConfigurationService) {
    this.logger = this.createLogger();
  }

  /**
   * Set correlation ID for all subsequent logs in this request
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
    this.baseContext.correlationId = correlationId;
  }

  /**
   * Set user ID for all subsequent logs in this request
   */
  setUserId(userId: string): void {
    this.userId = userId;
    this.baseContext.userId = userId;
  }

  /**
   * Set additional base context that will be included in all logs
   */
  setBaseContext(context: Record<string, any>): void {
    Object.assign(this.baseContext, context);
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | undefined {
    return this.correlationId;
  }

  /**
   * Get current user ID
   */
  getUserId(): string | undefined {
    return this.userId;
  }

  // ============================================================================
  // Core Logging Methods
  // ============================================================================

  /**
   * Log trace level message
   */
  trace(message: string, context?: LogContext): void {
    this.log('trace', message, context);
  }

  /**
   * Log debug level message
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log info level message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log warning level message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log error level message
   */
  error(message: string, context?: ErrorLogContext): void {
    const errorContext = this.processErrorContext(context);
    this.log('error', message, errorContext);
  }

  /**
   * Log fatal level message
   */
  fatal(message: string, context?: ErrorLogContext): void {
    const errorContext = this.processErrorContext(context);
    this.log('fatal', message, errorContext);
  }

  // ============================================================================
  // Specialized Logging Methods
  // ============================================================================

  /**
   * Log HTTP request/response
   */
  http(message: string, context: HttpLogContext): void {
    const httpContext = {
      ...context,
      type: 'http',
    };

    const level = this.getHttpLogLevel(context.statusCode);
    this.log(level, message, httpContext);
  }

  /**
   * Log database operations
   */
  database(message: string, context: DatabaseLogContext): void {
    const dbContext = {
      ...context,
      type: 'database',
    };

    // Log slow queries as warnings
    const level =
      context.executionTime && context.executionTime > 1000 ? 'warn' : 'debug';
    this.log(level, message, dbContext);
  }

  /**
   * Log business operations
   */
  business(message: string, context: BusinessLogContext): void {
    const businessContext = {
      ...context,
      type: 'business',
    };

    this.log('info', message, businessContext);
  }

  /**
   * Log security events
   */
  security(
    message: string,
    context: LogContext & { severity?: 'low' | 'medium' | 'high' | 'critical' },
  ): void {
    const securityContext = {
      ...context,
      type: 'security',
      severity: context.severity || 'medium',
    };

    const level = this.getSecurityLogLevel(context.severity);
    this.log(level, message, securityContext);
  }

  /**
   * Log audit events
   */
  audit(
    message: string,
    context: LogContext & { action: string; resource: string },
  ): void {
    const auditContext = {
      ...context,
      type: 'audit',
    };

    this.log('info', message, auditContext);
  }

  /**
   * Log performance metrics
   */
  performance(
    message: string,
    context: LogContext & { duration: number; operation: string },
  ): void {
    const perfContext = {
      ...context,
      type: 'performance',
    };

    // Log slow operations as warnings
    const level = context.duration > 5000 ? 'warn' : 'info';
    this.log(level, message, perfContext);
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>): LoggingService {
    const childService = new LoggingService(this.config);
    childService.correlationId = this.correlationId;
    childService.userId = this.userId;
    childService.setBaseContext({ ...this.baseContext, ...context });
    return childService;
  }

  /**
   * Time a function execution and log the result
   */
  async time<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext,
  ): Promise<T> {
    const startTime = Date.now();
    const startMessage = `Starting ${operation}`;

    this.debug(startMessage, { ...context, operation });

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.performance(`Completed ${operation}`, {
        ...context,
        operation,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.error(`Failed ${operation}`, {
        ...context,
        operation,
        duration,
        error: error as Error,
        success: false,
      });

      throw error;
    }
  }

  /**
   * Log with Result pattern success/failure
   */
  result<T, E>(
    operation: string,
    result: { kind: 'success'; value: T } | { kind: 'failure'; error: E },
    context?: LogContext,
  ): void {
    if (result.kind === 'success') {
      this.info(`${operation} succeeded`, {
        ...context,
        operation,
        success: true,
      });
    } else {
      this.error(`${operation} failed`, {
        ...context,
        operation,
        error: result.error as any,
        success: false,
      });
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Core logging method
   */
  private log(level: string, message: string, context?: LogContext): void {
    const logContext = this.buildLogContext(context);

    // Use Pino's level methods
    (this.logger as any)[level](logContext, message);
  }

  /**
   * Build complete log context
   */
  private buildLogContext(context?: LogContext): Record<string, any> {
    return {
      ...this.baseContext,
      ...context,
      correlationId: context?.correlationId || this.correlationId,
      userId: context?.userId || this.userId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Process error context to extract error details
   */
  private processErrorContext(context?: ErrorLogContext): LogContext {
    if (!context?.error) return context || {};

    const { error, ...restContext } = context;

    return {
      ...restContext,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      ...(error as any).toJSON?.(),
    };
  }

  /**
   * Get appropriate log level for HTTP status codes
   */
  private getHttpLogLevel(statusCode?: number): string {
    if (!statusCode) return 'info';

    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    if (statusCode >= 300) return 'info';
    return 'info';
  }

  /**
   * Get appropriate log level for security events
   */
  private getSecurityLogLevel(severity?: string): string {
    switch (severity) {
      case 'critical':
        return 'fatal';
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
      default:
        return 'info';
    }
  }

  /**
   * Create Pino logger instance
   */
  private createLogger(): PinoLogger {
    if (this.config.isTest) {
      return pino(createTestPinoConfig());
    }

    if (this.config.isDevelopment) {
      return pino(createDevelopmentPinoConfig());
    }

    const pinoConfig = createPinoConfig(this.config);
    return pino(pinoConfig);
  }
}
