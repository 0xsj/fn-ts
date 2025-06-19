import { v4 as uuidv4 } from 'uuid';
import type { Request } from 'express';
import { ApiResponseType } from '../response/types';

export interface RequestMetadata {
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: unknown;
}

export class RequestContext {
  public readonly correlationId: string;
  public readonly timestamp: Date;
  public readonly path: string;
  public readonly method: string;

  private response: ApiResponseType | null = null;
  private readonly metadata: Map<string, unknown> = new Map();
  private readonly startTime: number = Date.now();

  constructor(req: Request, correlationId?: string) {
    this.correlationId =
      correlationId ||
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      uuidv4();
    this.timestamp = new Date();
    this.path = req.path;
    this.method = req.method;

    // Set default metadata
    this.setMetadata('userAgent', req.get('user-agent'));
    this.setMetadata('ip', req.ip);
  }

  public setResponse(response: ApiResponseType): void {
    if (this.response) {
      throw new Error('Response already set for this context');
    }
    this.response = response;
  }

  public getResponse(): ApiResponseType | null {
    return this.response;
  }

  public setMetadata(key: string, value: unknown): void {
    this.metadata.set(key, value);
  }

  public getMetadata(key: string): unknown {
    return this.metadata.get(key);
  }

  public getAllMetadata(): RequestMetadata {
    return Object.fromEntries(this.metadata) as RequestMetadata;
  }

  public getDuration(): number {
    return Date.now() - this.startTime;
  }

  public toLogContext(): Record<string, unknown> {
    return {
      correlationId: this.correlationId,
      path: this.path,
      method: this.method,
      duration: this.getDuration(),
      metadata: this.getAllMetadata(),
    };
  }
}
