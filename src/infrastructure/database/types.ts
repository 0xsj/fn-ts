import { UserDB, UserPasswordDB } from '../../domain/entities';

export interface Database {
  users: UserDB;
  user_passwords: UserPasswordDB;
}
