export const TOKENS = {
  //core
  Logger: Symbol.for('Logger'),
  Config: Symbol.for('Config'),
  TransactionManager: Symbol.for('TransactionManager'),

  // Infrastructure
  Database: Symbol.for('Database'),
  RedisClient: Symbol.for('RedisClient'),
  CacheManager: Symbol.for('CacheManager'),
  CacheService: Symbol.for('CacheService'),
  EventBus: Symbol.for('EventBus'),
  QueueManager: Symbol.for('QueueManager'),

  // Repositories
  AnalyticsRepository: Symbol.for('AnalyticsRepository'),
  UserRepository: Symbol.for('UserRepository'),
  AuthRepository: Symbol.for('AuthRepository'),
  OrganizationRepository: Symbol.for('OrganizationRepository'),
  AccessControlRepository: Symbol.for('AccessControlRepository'),
  NotificationRepository: Symbol.for('NotificationRepository'),
  CommunicationRepository: Symbol.for('CommunicationRepository'),
  LocationRepository: Symbol.for('LocationRepository'),
  FileRepository: Symbol.for('FileRepository'),
  OperationsRepository: Symbol.for('OperationsRepository'),

  // Services
  AnalyticsService: Symbol.for('AnalyticsService'),
  UserService: Symbol.for('UserService'),
  AuthService: Symbol.for('AuthService'),
  OrganizationService: Symbol.for('OrganizationService'),
  AccessControlService: Symbol.for('AccessControlService'),
  NotificationService: Symbol.for('NotificationService'),
  CommunicationService: Symbol.for('CommunicationService'),
  LocationService: Symbol.for('LocationService'),
  FileService: Symbol.for('FileService'),
  OperationsService: Symbol.for('OperationsService'),

  // Supporting Services
  HealthCheckService: Symbol.for('HealthCheckService'),
  // JwtService: Symbol.for('JwtService'),
  EmailService: Symbol.for('EmailService'),
  // SmsService: Symbol.for('SmsService'),
  // StorageService: Symbol.for('StorageService'),
  // SearchService: Symbol.for('SearchService'),

  // monitoring
  PrometheusRegistry: Symbol.for('PrometheusRegistry'),
  MetricsService: Symbol.for('MetricsService'),
  HealthCollector: Symbol.for('HealthCollector'),
  HttpCollector: Symbol.for('HttpCollector'),
  QueueCollector: Symbol.for('QueueCollector'),
  BusinessCollector: Symbol.for('BusinessCollector'),

  // processors and jobs
  EmailProcessor: Symbol.for('EmailProcessor'),
  NotificationProcessor: Symbol.for('NotificationProcessor'),
  AnalyticsProcessor: Symbol.for('AnalyticsProcessor'),
} as const;
