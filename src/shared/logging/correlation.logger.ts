/**
 * Correlation logger for request tracking and distributed tracing
 * Manages correlation IDs throughout request lifecycle
 *
 * File: src/shared/logging/correlation.logger.ts
 */

import { Injectable, Scope } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { LoggingService } from './logging.service';

export interface CorrelationContext {
  correlationId: string;
  startTime: number;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  parentId?: string;
  traceId?: string;
  spanId?: string;
}

/**
 * Correlation logger for tracking requests across services
 */
@Injectable({ scope: Scope.REQUEST })
export class CorrelationLogger {
  private context?: CorrelationContext;

  constructor(private readonly loggingService: LoggingService) {}

  /**
   * Initialize correlation context from Fastify request
   */
  initializeFromRequest(req: FastifyRequest): CorrelationContext {
    const correlationId = this.extractCorrelationId(req);
    const context: CorrelationContext = {
      correlationId,
      startTime: Date.now(),
      requestId: uuidv4(),
      parentId: req.headers['x-parent-id'] as string,
      traceId: (req.headers['x-trace-id'] as string) || correlationId,
      spanId: uuidv4(),
      userId: this.extractUserId(req),
      sessionId: this.extractSessionId(req),
    };

    this.context = context;
    this.loggingService.setCorrelationId(correlationId);

    if (context.userId) {
      this.loggingService.setUserId(context.userId);
    }

    // Set additional base context
    this.loggingService.setBaseContext({
      requestId: context.requestId,
      traceId: context.traceId,
      spanId: context.spanId,
      parentId: context.parentId,
    });

    return context;
  }

  /**
   * Initialize correlation context manually (for background jobs, workers, etc.)
   */
  initializeManual(
    options: Partial<CorrelationContext> = {},
  ): CorrelationContext {
    const correlationId = options.correlationId || uuidv4();
    const context: CorrelationContext = {
      correlationId,
      startTime: Date.now(),
      requestId: options.requestId || uuidv4(),
      traceId: options.traceId || correlationId,
      spanId: options.spanId || uuidv4(),
      parentId: options.parentId,
      userId: options.userId,
      sessionId: options.sessionId,
    };

    this.context = context;
    this.loggingService.setCorrelationId(correlationId);

    if (context.userId) {
      this.loggingService.setUserId(context.userId);
    }

    this.loggingService.setBaseContext({
      requestId: context.requestId,
      traceId: context.traceId,
      spanId: context.spanId,
      parentId: context.parentId,
    });

    return context;
  }

  /**
   * Get current correlation context
   */
  getContext(): CorrelationContext | undefined {
    return this.context;
  }

  /**
   * Get correlation ID
   */
  getCorrelationId(): string | undefined {
    return this.context?.correlationId;
  }

  /**
   * Update user ID in correlation context
   */
  setUserId(userId: string): void {
    if (this.context) {
      this.context.userId = userId;
      this.loggingService.setUserId(userId);
    }
  }

  /**
   * Create child span for nested operations
   */
  createChildSpan(operation: string): CorrelationLogger {
    if (!this.context) {
      throw new Error('Correlation context not initialized');
    }

    const childLogger = new CorrelationLogger(
      this.loggingService.child({ operation }),
    );
    const childContext: CorrelationContext = {
      ...this.context,
      spanId: uuidv4(),
      parentId: this.context.spanId,
      startTime: Date.now(),
    };

    childLogger.context = childContext;
    return childLogger;
  }

  /**
   * Log request start
   */
  logRequestStart(req: FastifyRequest): void {
    this.loggingService.http('Request started', {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: this.getClientIp(req),
      headers: this.sanitizeHeaders(req.headers),
      query: req.query,
      body: this.sanitizeBody(req.body),
    });
  }

  /**
   * Log request completion
   */
  logRequestEnd(req: FastifyRequest, reply: FastifyReply): void {
    if (!this.context) return;

    const duration = Date.now() - this.context.startTime;

    this.loggingService.http('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: reply.statusCode,
      responseTime: duration,
      // Fastify doesn't have res.get(), headers are accessed differently
    });
  }

  /**
   * Log request error
   */
  logRequestError(req: FastifyRequest, error: Error): void {
    this.loggingService.error('Request failed', {
      method: req.method,
      url: req.url,
      error,
      userAgent: req.headers['user-agent'],
      ip: this.getClientIp(req),
    });
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(
    operation: string,
    context: {
      query?: string;
      parameters?: any[];
      duration?: number;
      affectedRows?: number;
    },
  ): void {
    this.loggingService.database(`Database ${operation}`, {
      operation,
      query: context.query,
      parameters: context.parameters,
      executionTime: context.duration,
      affectedRows: context.affectedRows,
    });
  }

  /**
   * Log external service call
   */
  logExternalCall(
    service: string,
    operation: string,
    context: {
      url?: string;
      method?: string;
      statusCode?: number;
      duration?: number;
      error?: Error;
    },
  ): void {
    const level = context.error ? 'error' : 'info';

    this.loggingService[level](`External service ${service} ${operation}`, {
      service,
      operation,
      url: context.url,
      method: context.method,
      statusCode: context.statusCode,
      duration: context.duration,
      error: context.error,
      type: 'external_service',
    });
  }

  /**
   * Log business operation
   */
  logBusinessOperation(
    operation: string,
    context: {
      entityType?: string;
      entityId?: string;
      action?: string;
      success?: boolean;
      duration?: number;
      metadata?: Record<string, any>;
    },
  ): void {
    this.loggingService.business(`Business operation: ${operation}`, {
      operation,
      entityType: context.entityType,
      entityId: context.entityId,
      action: context.action,
      success: context.success,
      duration: context.duration,
      metadata: context.metadata,
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    event: string,
    context: {
      severity?: 'low' | 'medium' | 'high' | 'critical';
      action?: string;
      resource?: string;
      ip?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    },
  ): void {
    this.loggingService.security(`Security event: ${event}`, {
      event,
      severity: context.severity || 'medium',
      action: context.action,
      resource: context.resource,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: context.metadata,
    });
  }

  /**
   * Add correlation headers to outgoing requests
   */
  getCorrelationHeaders(): Record<string, string> {
    if (!this.context) return {};

    return {
      'x-correlation-id': this.context.correlationId,
      'x-trace-id': this.context.traceId,
      'x-parent-id': this.context.spanId,
      'x-request-id': this.context.requestId,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Extract correlation ID from request headers
   */
  private extractCorrelationId(req: FastifyRequest): string {
    return (
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      (req.headers['x-trace-id'] as string) ||
      uuidv4()
    );
  }

  /**
   * Extract user ID from request (JWT, session, etc.)
   */
  private extractUserId(req: FastifyRequest): string | undefined {
    // Try to extract from authenticated user (Fastify request decorations)
    const user = (req as any).user;
    if (user?.id) return user.id;
    if (user?.sub) return user.sub;

    // Try to extract from custom header
    return req.headers['x-user-id'] as string;
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(req: FastifyRequest): string | undefined {
    // Try to extract from session (if using fastify-session)
    const session = (req as any).session;
    if (session?.id) return session.id;

    // Try to extract from custom header
    return req.headers['x-session-id'] as string;
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: FastifyRequest): string {
    return (
      req.ip ||
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];
    const sanitized = { ...headers };

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body for logging (remove sensitive data)
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'creditCard',
    ];
    const sanitized = { ...body };

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
