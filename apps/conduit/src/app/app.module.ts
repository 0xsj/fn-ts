import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PulsarModule } from '@hrms/pulsar';

@Module({
  imports: [PulsarModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
