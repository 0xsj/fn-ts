import { Kysely } from 'kysely';
import { Database } from '../types';

export class OperationsRepository {
  constructor(private db: Kysely<Database>) {}
}
