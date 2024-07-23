/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app/app.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'auth',
        brokers: ['localhost:9093'],
        ssl: false,
        sasl: {
          mechanism: 'plain',
          username: process.env.KAFKA_DEFAULT_USERS || 'kafka',
          password: process.env.KAFKA_DEFAULT_PASSWORDS || 'admin123',
        },
      },
      consumer: {
        groupId: 'auth',
      },
    },
  });

  const logger = new Logger();
  app.useLogger(logger);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  const port = process.env.AUTH_SERVICE_PORT || 3000;
  await app.listen(port);
  await app.startAllMicroservices();

  logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
