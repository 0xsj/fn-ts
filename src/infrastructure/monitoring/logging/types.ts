import type { RequestContext } from '../../../shared/context';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  service?: string;
  module?: string;
  method?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context: LogContext;
  error?: Error | unknown;
  data?: Record<string, unknown>;
}

export interface LoggerTransport {
  name: string;
  level: LogLevel;
  isReady(): boolean;
  log(entry: LogEntry): Promise<void>;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}

export interface LoggerOptions {
  level?: LogLevel;
  service?: string;
  context?: LogContext;
  transports?: LoggerTransport[];
  redactPaths?: string[];
  sampling?: {
    enabled: boolean;
    rate: number;
  };
}

export interface ILogger {
  fatal(message: string, data?: Record<string, unknown>): void;
  fatal(error: Error, message: string, data?: Record<string, unknown>): void;

  error(message: string, data?: Record<string, unknown>): void;
  error(error: Error, message: string, data?: Record<string, unknown>): void;

  warn(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
  trace(message: string, data?: Record<string, unknown>): void;

  child(context: LogContext): ILogger;
  setContext(context: LogContext): void;

  // For request context
  withRequest(context: RequestContext): ILogger;
}

export const LOG_LEVELS: Record<LogLevel, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

export function shouldLog(messageLevel: LogLevel, transportLevel: LogLevel): boolean {
  return LOG_LEVELS[messageLevel] >= LOG_LEVELS[transportLevel];
}
