import { Module, Global, DynamicModule } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { CorrelationLogger } from './correlation.logger';
import { ConfigurationService } from 'src/config';

export interface LoggingModuleOptions {
  isGlobal?: boolean;
  configService?: ConfigurationService;
}

@Global()
@Module({})
export class LoggingModule {
  static forRoot(options: LoggingModuleOptions = {}): DynamicModule {
    const { isGlobal = true } = options;

    return {
      module: LoggingModule,
      global: isGlobal,
      providers: [
        LoggingService,
        CorrelationLogger,
        ...(options.configService
          ? [
              {
                provide: ConfigurationService,
                useValue: options.configService,
              },
            ]
          : []),
      ],
      exports: [LoggingService, CorrelationLogger],
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: LoggingModule,
      providers: [LoggingService, CorrelationLogger],
      exports: [LoggingService, CorrelationLogger],
    };
  }
}
