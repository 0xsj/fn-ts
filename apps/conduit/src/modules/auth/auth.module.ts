import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Module({
  imports: [ClientsModule.register([])],
  providers: [AuthService],
})
export class AuthModule {}
