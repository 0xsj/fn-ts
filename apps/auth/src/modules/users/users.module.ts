import { Module } from '@nestjs/common';
import { UserController } from './users.controller';

@Module({
  controllers: [UserController],
  providers: [],
  exports: [],
})
export class UserModule {}
