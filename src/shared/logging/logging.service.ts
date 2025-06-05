export interface LogContext {
  correlationId?: string;
  userId?: string;
  action?: string;
  resource?: string;
  metadata?: Record<string, any>;
  duration?: number;
  [key: string]: any;
}

export interface ErrorLogContext extends LogContext {}

export interface HttpLogContext extends LogContext {}

export interface DatabaseLogContext extends LogContext {}

export interface BusinessLogContext extends LogContext {}

export class LoggingService {}
