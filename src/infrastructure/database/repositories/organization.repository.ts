import { Kysely } from 'kysely';
import { Database } from '../types';

export class OrganizationRepository {
  constructor(private db: Kysely<Database>) {}
}
