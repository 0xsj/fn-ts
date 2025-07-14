// src/core/app/application.ts
import { Server } from 'http';
import express, { Application as ExpressApp } from 'express';
import { DIContainer } from '../di/container';
import { logger } from '../../shared/utils/logger';
import { Shutdown } from './shutdown';
import { config } from '../config';
import { SocketServer } from '../../infrastructure/websocket/server/socket.server';
import { TOKENS } from '../di/tokens';

export class Application {
  private app: ExpressApp;
  private server: Server | null = null;
  private socketServer: SocketServer | null = null;
  private shutdown: Shutdown;
  private initialized = false;

  constructor() {
    this.app = express();
    this.shutdown = new Shutdown();
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Application already initialized');
      return;
    }

    try {
      logger.info('Initializing application...');

      // Initialize DI container
      await DIContainer.initialize();

      // Initialize Express app
      const { initializeApp } = await import('../../app');
      await initializeApp();

      this.initialized = true;
      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error?.constructor?.name,
        errorDetails: JSON.stringify(error),
      });
      throw error;
    }
  }

  /**
   * Start the application
   */
  async start(port: number = 3000, host: string = '0.0.0.0'): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Import the configured app
      const { default: app } = await import('../../app');

      this.server = app.listen(port, host, () => {
        logger.info(`Server started`, {
          port,
          host,
          url: `http://${host}:${port}`,
          environment: process.env.NODE_ENV,
          pid: process.pid,
        });
      });

      // Initialize WebSocket server if enabled
      if (config.websocket.enabled) {
        try {
          this.socketServer = DIContainer.resolve<SocketServer>(TOKENS.SocketServer);
          await this.socketServer.initialize(this.server);

          logger.info('WebSocket server initialized', {
            path: config.websocket.path,
            url: `ws://${host}:${port}${config.websocket.path}`,
          });
        } catch (error) {
          logger.error('Failed to initialize WebSocket server', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Decide if WebSocket failure should crash the app
          if (config.app.env === 'production') {
            throw error; // Fail hard in production
          } else {
            logger.warn('Continuing without WebSocket server in development');
          }
        }
      } else {
        logger.info('WebSocket server disabled by configuration');
      }

      // Setup graceful shutdown
      this.setupShutdownHandlers();

      // Handle server errors
      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${port} is already in use`);
        } else {
          logger.error('Server error', { error });
        }
        process.exit(1);
      });
    } catch (error) {
      logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Stop the application
   */
  async stop(): Promise<void> {
    // Register WebSocket shutdown if it exists
    if (this.socketServer) {
      this.shutdown.registerHandler(async () => {
        await this.socketServer!.shutdown();
      });
    }

    await this.shutdown.gracefulShutdown();
  }

  /**
   * Setup shutdown handlers
   */
  private setupShutdownHandlers(): void {
    // Set server for shutdown handler
    if (this.server) {
      this.shutdown.setServer(this.server);
    }

    // Handle graceful shutdown on SIGTERM and SIGINT
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, starting graceful shutdown...');
      this.stop();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, starting graceful shutdown...');
      this.stop();
    });

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error });
      this.stop();
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
      this.stop();
    });
  }

  /**
   * Get Express app instance
   */
  getApp(): ExpressApp {
    return this.app;
  }

  /**
   * Get server instance
   */
  getServer(): Server | null {
    return this.server;
  }

  /**
   * Get WebSocket server instance
   */
  getSocketServer(): SocketServer | null {
    return this.socketServer;
  }

  /**
   * Register shutdown handler
   */
  onShutdown(handler: () => Promise<void>): void {
    this.shutdown.registerHandler(handler);
  }
}
