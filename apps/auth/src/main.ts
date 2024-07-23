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
import { MicroserviceOptions } from '@nestjs/microservices';
import { PulsarTransportStrategy } from '@hrms/pulsar';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule);

  const pulsarOptions = {
    serviceUrl: 'pulsar://localhost:6650',
    topic: 'my-topic',
    subscription: 'my-subscription',
    subscriptionType: 'Exclusive',
  };

  const msOptions: MicroserviceOptions = {
    strategy: new PulsarTransportStrategy(pulsarOptions),
  };

  const microservice = app.connectMicroservice(msOptions);

  const logger = new Logger();
  app.useLogger(logger);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  const port = process.env.AUTH_SERVICE_PORT || 3000;
  await app.listen(port);

  logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
