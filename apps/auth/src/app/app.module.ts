import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PulsarModule } from '@fromis/pulsar';

@Module({
  imports: [
    // LoggerModule.forRootAsync({
    //   inject: [ConfigService],
    // }),
    PulsarModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
