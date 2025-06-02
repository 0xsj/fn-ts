import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from './configuration.schema';
import { ConfigurationFactory } from './configuration.factory';

@Injectable()
export class ConfigurationService {
  constructor(
    private readonly configService: ConfigService<AppConfiguration, true>,
  ) {}

  get app() {}

  get isDevelopment(): boolean {}

  get isProduction(): boolean {}

  get isTest(): boolean {}

  get isStaging(): boolean {}

  get database() {}

  get databaseUrl() {}

  get security() {}

  get jwt() {}

  get bcrypt() {}

  get session() {}

  get services() {}

  get redis() {}

  get email() {}

  get storage() {}

  get logging() {}

  get monitoring() {}

  get health() {}

  get metrics() {}

  get swagger() {}

  get() {}

  getOrThrow() {}

  has() {}

  getAll() {}

  getSanitized() {}

  static createForEnvironment() {}

  static createTestConfig() {}

  static createDevelopmentConfig() {}

  static createProductionConfig() {}

  static validate() {}
}
