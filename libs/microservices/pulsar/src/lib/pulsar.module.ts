import { Module } from '@nestjs/common';
import { PulsarProducerService } from './pulsar-producer.service';
import { PulsarClientService } from './pulsar-client.service';
import { PULSAR_CLIENT } from './pulsar.constants';
import { Client } from 'pulsar-client';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PulsarTransportStrategy } from './pulsar-transport.strategy';

@Module({
  imports: [ConfigModule],
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
    {
      provide: 'PULSAR_TRANSPORT_STRATEGY',
      useFactory: (configService: ConfigService) => {
        const pulsarOptions = {
          serviceUrl: 'pulsar://localhost:6650',
          topic: 'my-topic',
          subscription: 'my-subscription',
          subscriptionType: 'Exclusive',
        };
        return new PulsarTransportStrategy(pulsarOptions);
      },
      inject: [ConfigService],
    },
  ],
  exports: [PulsarProducerService, PULSAR_CLIENT, 'PULSAR_TRANSPORT_STRATEGY'],
})
export class PulsarModule {}
