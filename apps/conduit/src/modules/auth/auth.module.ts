import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH-SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'auth',
            brokers: ['localhost:9093'],
          },
          consumer: {
            groupId: 'auth',
          },
        },
      },
    ]),
  ],
  providers: [AuthService],
})
export class AuthModule {}
