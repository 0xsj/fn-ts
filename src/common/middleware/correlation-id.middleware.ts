/**
 * Alternative approach: Fastify plugin for correlation ID logging
 * This is the more "Fastify-native" way to handle logging with hooks
 *
 * File: src/shared/logging/fastify-correlation.plugin.ts
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import fp from 'fastify-plugin';

// Extend Fastify Request type
declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
    startTime: number;
  }
}

/**
 * Fastify plugin for correlation ID and request logging
 */
async function correlationPlugin(fastify: FastifyInstance) {
  // Hook to initialize correlation ID before request processing
  fastify.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Extract or generate correlation ID
      const correlationId =
        (request.headers['x-correlation-id'] as string) ||
        (request.headers['x-request-id'] as string) ||
        (request.headers['x-trace-id'] as string) ||
        uuidv4();

      // Attach to request
      request.correlationId = correlationId;
      request.startTime = Date.now();

      // Add to response headers
      reply.header('x-correlation-id', correlationId);
      reply.header('x-request-id', uuidv4());

      // Log request start
      fastify.log.info({
        correlationId,
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        msg: 'Request started',
      });
    },
  );

  // Hook to log response completion
  fastify.addHook(
    'onSend',
    async (request: FastifyRequest, reply: FastifyReply, payload) => {
      const duration = Date.now() - request.startTime;

      fastify.log.info({
        correlationId: request.correlationId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: duration,
        msg: 'Request completed',
      });

      return payload;
    },
  );

  // Hook to log errors
  fastify.addHook(
    'onError',
    async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
      const duration = Date.now() - request.startTime;

      fastify.log.error({
        correlationId: request.correlationId,
        method: request.method,
        url: request.url,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        duration,
        msg: 'Request failed',
      });
    },
  );
}

// Export as Fastify plugin
export default fp(correlationPlugin, {
  name: 'correlation-logging',
  fastify: '4.x',
});

/**
 * How to use this plugin in main.ts:
 *
 * import correlationPlugin from './shared/logging/fastify-correlation.plugin';
 *
 * // In configureFastifyPlugins function:
 * await fastifyInstance.register(correlationPlugin);
 */
