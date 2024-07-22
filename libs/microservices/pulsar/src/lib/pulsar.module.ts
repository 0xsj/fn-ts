import { Module } from '@nestjs/common';
import { PulsarProducerService } from './pulsar-producer.service';
import { PulsarClientService } from './pulsar-client.service';
import { PULSAR_CLIENT } from './pulsar.constants';
import { Client } from 'pulsar-client';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [
    {
      provide: PULSAR_CLIENT,
      useFactory: (configService: ConfigService) =>
        new Client({
          serviceUrl: configService.getOrThrow('PULSAR_SERVICE_URL'),
        }),
      inject: [ConfigService],
    },
    PulsarProducerService,
    PulsarClientService,
  ],
  exports: [PulsarProducerService, PULSAR_CLIENT],
})
export class PulsarModule {}
