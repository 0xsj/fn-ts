import { Kysely } from 'kysely';
import { Database } from '../types';

export class AccessControlRepository {
  constructor(private db: Kysely<Database>) {}
}
