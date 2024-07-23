/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'profile',
        brokers: ['localhost:9093'],
        ssl: false,
        sasl: {
          mechanism: 'plain',
          username: process.env.KAFKA_DEFAULT_USERS || 'kafka',
          password: process.env.KAFKA_DEFAULT_PASSWORDS || 'admin123',
        },
      },
      consumer: {
        groupId: 'profile',
      },
    },
  });

  // const microService = app.connectMicroservice();
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = 3030;
  await app.listen(port);
  await app.startAllMicroservices();

  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
