import { NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { CorrelationLogger } from 'src/shared/logging/correlation.logger';
declare module 'fastify' {
  interface FastifyRequest {
    correlationId?: string;
    correlationLogger?: CorrelationLogger;
  }
}

export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: (error?: Error | any) => void) {
    throw new Error('Method not implemented.');
  }
}
