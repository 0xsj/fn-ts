import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'PROFILE-SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'profile',
            brokers: ['localhost:9093'],
          },
          consumer: {
            groupId: 'profile',
          },
        },
      },
    ]),
  ],
})
export class ProfileModule {}
