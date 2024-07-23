import { Module } from '@nestjs/common';
import { CassandraService } from '@fromis/cassandra';
@Module({
  imports: [],
  providers: [CassandraService],
})
export class ProfileModule {}
