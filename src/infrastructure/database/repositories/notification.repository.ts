import { Kysely } from 'kysely';
import { Database } from '../types';

export class NotificationRepository {
  constructor(private db: Kysely<Database>) {}
}
