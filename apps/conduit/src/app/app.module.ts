import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PulsarModule } from '@fromis/pulsar';
import { ProfileModule } from '../modules/profile/profile.module';
import { AuthModule } from '../modules/auth/auth.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

@Module({
  imports: [
    PulsarModule,
    ProfileModule,
    AuthModule,
    GraphQLModule.forRoot({
      driver: ApolloDriver,
      autoSchemaFile: true,
      include: [AuthModule, ProfileModule],
      cors: {
        origin: '*',
        credentials: false,
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
