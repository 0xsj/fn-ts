export const TOKENS = {
  Database: Symbol.for('Database'),
  UserRepository: Symbol.for('UserRepository'),
  UserService: Symbol.for('UserService'),
  RedisClient: Symbol.for('RedisClient'),
  CacheManager: Symbol.for('CacheManager'),
  CacheService: Symbol.for('CacheService'),
  HealthCheckService: Symbol.for('HealthCheckService'),
  EventBus: Symbol.for('EventBus'),
  QueueManager: Symbol.for('QueueManager'),
} as const;
