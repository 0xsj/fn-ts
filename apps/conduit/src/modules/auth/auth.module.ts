import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';

@Module({
  controllers: [],
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
  providers: [AuthService, AuthResolver],
})
export class AuthModule {}
