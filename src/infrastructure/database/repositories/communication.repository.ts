import { Kysely } from 'kysely';
import { Database } from '../types';

export class CommunicationRepository {
  constructor(private db: Kysely<Database>) {}
}
