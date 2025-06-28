import { Kysely } from 'kysely';
import { Database } from '../types';

export class FileRepository {
  constructor(private db: Kysely<Database>) {}
}
