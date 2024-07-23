import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PulsarModule } from '@fromis/pulsar';
import { ProfileModule } from '../modules/profile/profile.module';
import { AuthModule } from '../modules/auth/auth.module';

@Module({
  imports: [PulsarModule, ProfileModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
