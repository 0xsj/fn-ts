// src/infrastructure/cache/redis.client.ts
import { createClient, RedisClientType } from 'redis';
import { logger } from '../../shared/utils/logger';
import { config } from '../../core/config';

export class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType;
  private subscriber: RedisClientType;
  private publisher: RedisClientType;
  private isConnected = false;

  private constructor() {
    const redisConfig = {
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
      database: config.redis.db,
    };

    // Main client for cache operations
    this.client = createClient(redisConfig);

    // Separate clients for pub/sub to avoid blocking
    this.subscriber = createClient(redisConfig);
    this.publisher = createClient(redisConfig);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    const clients = [
      { name: 'main', client: this.client },
      { name: 'subscriber', client: this.subscriber },
      { name: 'publisher', client: this.publisher },
    ];

    clients.forEach(({ name, client }) => {
      client.on('error', (err) => {
        logger.error(`Redis ${name} client error:`, err);
      });

      client.on('connect', () => {
        logger.info(`Redis ${name} client connected`);
      });

      client.on('ready', () => {
        logger.info(`Redis ${name} client ready`);
      });

      client.on('end', () => {
        logger.info(`Redis ${name} client disconnected`);
      });

      client.on('reconnecting', () => {
        logger.info(`Redis ${name} client reconnecting`);
      });
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect(),
      ]);
      this.isConnected = true;
      logger.info('All Redis clients connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await Promise.all([this.client.quit(), this.subscriber.quit(), this.publisher.quit()]);
      this.isConnected = false;
      logger.info('All Redis clients disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis', error);
      throw error;
    }
  }

  public getClient(): RedisClientType {
    if (!this.isConnected) {
      throw new Error('Redis client is not connected');
    }
    return this.client;
  }

  public getSubscriber(): RedisClientType {
    if (!this.isConnected) {
      throw new Error('Redis subscriber is not connected');
    }
    return this.subscriber;
  }

  public getPublisher(): RedisClientType {
    if (!this.isConnected) {
      throw new Error('Redis publisher is not connected');
    }
    return this.publisher;
  }
}
