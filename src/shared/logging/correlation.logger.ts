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

export class CorrelationLogger {}
