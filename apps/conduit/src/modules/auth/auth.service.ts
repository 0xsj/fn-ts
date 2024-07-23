import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class AuthService implements OnModuleInit {
  onModuleInit() {
    Logger.log('GATEWAY: AUTH SERVICE');
    return {};
  }

  getUsers() {
    return {};
  }

  getUserByEmail() {
    return {};
  }

  createUser() {
    return {};
  }
}
