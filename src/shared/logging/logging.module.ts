import { ConfigurationService } from 'src/config';

export interface LoggingModuleOptions {
  isGlobal?: boolean;
  configService?: ConfigurationService;
}

export class LoggingModule {}
