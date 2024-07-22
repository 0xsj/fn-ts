import { ConfigService } from '@nestjs/config';
import { Expose, Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { decorate } from 'ts-mixer';

export enum Environment {
  Development = 'development',
  DockerDevelopment = 'docker_development',
  Production = 'production',
  Staging = 'staging',
  Test = 'test',
}

export type AppConfigService<T = BaseEnv> = ConfigService<T>;

export class BaseEnv {
  @decorate(Expose())
  @decorate(IsEnum(Environment))
  NODE_ENV: Environment;

  @decorate(Expose())
  @decorate(IsOptional())
  @decorate(IsString())
  APP_NAME?: string;

  APP_VERSION: string;

  PORT: string;

  HOSTNAME: string;

  FRONTEND_URL: string;
}
