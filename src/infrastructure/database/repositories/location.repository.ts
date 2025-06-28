import { Kysely } from 'kysely';
import { Database } from '../types';

export class LocationRepository {
  constructor(private db: Kysely<Database>) {}
}
