import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserRepository } from '@fromis/repositories';
import { CassandraService } from '@fromis/cassandra';
@Module({
  controllers: [UserController],
  providers: [CassandraService, UserRepository],
  exports: [],
})
export class UserModule {}
