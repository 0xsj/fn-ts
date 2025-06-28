import { Kysely } from 'kysely';
import { Database } from '../types';

export class AnalyticsRepository {
  constructor(private db: Kysely<Database>) {}
}
