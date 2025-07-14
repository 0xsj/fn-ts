// src/infrastructure/websocket/server/socket.server.ts
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { config } from '../../../core/config';
import { logger } from '../../../shared/utils/logger';
import { SocketEvents, SocketContext } from '../types';
import { Injectable } from '../../../core/di/decorators';

@Injectable()
export class SocketServer {
  private io: SocketIOServer | null = null;
  private connectedSockets = new Map<string, SocketContext>();
  private initialized = false;

  /**
   * Initialize the Socket.IO server
   */
  async initialize(httpServer: HttpServer): Promise<SocketIOServer> {
    if (this.initialized && this.io) {
      return this.io;
    }

    if (!config.websocket.enabled) {
      logger.info('WebSocket server disabled by configuration');
      throw new Error('WebSocket server is disabled');
    }

    logger.info('Initializing WebSocket server...');

    // Create Socket.IO server
    this.io = new SocketIOServer<SocketEvents>(httpServer, {
      path: config.websocket.path,
      cors: config.websocket.cors,
      pingTimeout: config.websocket.pingTimeout,
      pingInterval: config.websocket.pingInterval,
      maxHttpBufferSize: config.websocket.maxHttpBufferSize,
      allowEIO3: config.websocket.allowEIO3,
      transports: ['websocket', 'polling'],
    });

    // Setup Redis adapter if enabled
    if (config.websocket.redis.enabled) {
      await this.setupRedisAdapter();
    }

    // Setup middleware and event handlers
    this.setupMiddleware();
    this.setupEventHandlers();

    this.initialized = true;
    logger.info('WebSocket server initialized successfully', {
      path: config.websocket.path,
      redisEnabled: config.websocket.redis.enabled,
    });

    return this.io;
  }

  /**
   * Setup Redis adapter for horizontal scaling
   */
  private async setupRedisAdapter(): Promise<void> {
    try {
      const pubClient = createClient({
        socket: {
          host: config.websocket.redis.host,
          port: config.websocket.redis.port,
        },
        password: config.websocket.redis.password,
        database: config.websocket.redis.db,
      });

      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);

      this.io!.adapter(
        createAdapter(pubClient, subClient, {
          key: config.websocket.redis.keyPrefix,
        }),
      );

      logger.info('Redis adapter configured for WebSocket scaling');
    } catch (error) {
      logger.error('Failed to setup Redis adapter for WebSocket', { error });
      throw error;
    }
  }

  /**
   * Setup middleware for authentication, rate limiting, etc.
   */
  private setupMiddleware(): void {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket: Socket, next) => {
      try {
        if (config.websocket.auth.required) {
          // We'll implement this in the auth middleware file
          // For now, just log the connection attempt
          logger.debug('Socket authentication required', {
            socketId: socket.id,
            handshake: socket.handshake.auth,
          });
        }
        next();
      } catch (error) {
        logger.error('Socket authentication failed', {
          socketId: socket.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware
    this.io.use(async (socket: Socket, next) => {
      // We'll implement rate limiting later
      next();
    });

    logger.debug('WebSocket middleware configured');
  }

  /**
   * Setup core event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    logger.debug('WebSocket event handlers configured');
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket): void {
    const socketContext: SocketContext = {
      socketId: socket.id,
      permissions: [],
      connectedAt: new Date(),
      lastActivity: new Date(),
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
    };

    this.connectedSockets.set(socket.id, socketContext);

    if (config.websocket.logging.logConnections) {
      logger.info('Socket connected', {
        socketId: socket.id,
        ip: socketContext.ipAddress,
        userAgent: socketContext.userAgent,
        totalConnections: this.connectedSockets.size,
      });
    }

    // Setup socket event handlers
    this.setupSocketEventHandlers(socket, socketContext);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }

  /**
   * Setup event handlers for individual socket
   */
  private setupSocketEventHandlers(socket: Socket, context: SocketContext): void {
    // System events
    socket.on('system:ping', () => {
      socket.emit('system:pong');
      this.updateLastActivity(context);
    });

    // Presence events
    socket.on('presence:status', (data) => {
      // We'll implement this in the presence handler
      this.updateLastActivity(context);
      logger.debug('Presence status update', { socketId: socket.id, data });
    });

    // Data subscription events
    socket.on('data:subscribe', (data) => {
      // We'll implement this in the data handler
      this.updateLastActivity(context);
      logger.debug('Data subscription', { socketId: socket.id, data });
    });

    socket.on('data:unsubscribe', (data) => {
      // We'll implement this in the data handler
      this.updateLastActivity(context);
      logger.debug('Data unsubscription', { socketId: socket.id, data });
    });

    // Notification events
    socket.on('notification:subscribe', () => {
      // We'll implement this in the notification handler
      this.updateLastActivity(context);
      logger.debug('Notification subscription', { socketId: socket.id });
    });
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnection(socket: Socket, reason: string): void {
    const context = this.connectedSockets.get(socket.id);

    if (config.websocket.logging.logDisconnections) {
      logger.info('Socket disconnected', {
        socketId: socket.id,
        reason,
        userId: context?.userId,
        duration: context ? Date.now() - context.connectedAt.getTime() : 0,
        totalConnections: this.connectedSockets.size - 1,
      });
    }

    // Clean up context
    this.connectedSockets.delete(socket.id);

    // Handle user going offline if they were authenticated
    if (context?.userId) {
      this.handleUserOffline(context.userId, socket.id);
    }
  }

  /**
   * Update last activity timestamp
   */
  private updateLastActivity(context: SocketContext): void {
    context.lastActivity = new Date();
  }

  /**
   * Handle user going offline
   */
  private handleUserOffline(userId: string, socketId: string): void {
    // Check if user has other active connections
    const userSockets = Array.from(this.connectedSockets.values()).filter(
      (ctx) => ctx.userId === userId && ctx.socketId !== socketId,
    );

    if (userSockets.length === 0) {
      // User is completely offline
      if (config.websocket.presence.enabled) {
        this.io?.emit('presence:user-offline', { userId });
      }
    }
  }

  /**
   * Get Socket.IO server instance
   */
  getServer(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Get connected socket by ID
   */
  getSocket(socketId: string): Socket | undefined {
    return this.io?.sockets.sockets.get(socketId);
  }

  /**
   * Get socket context
   */
  getSocketContext(socketId: string): SocketContext | undefined {
    return this.connectedSockets.get(socketId);
  }

  /**
   * Get all connected sockets for a user
   */
  getUserSockets(userId: string): SocketContext[] {
    return Array.from(this.connectedSockets.values()).filter((ctx) => ctx.userId === userId);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any): void {
    this.io?.emit(event, data);
  }

  /**
   * Send to specific user (all their connections)
   */
  sendToUser(userId: string, event: string, data: any): void {
    const userSockets = this.getUserSockets(userId);
    userSockets.forEach((ctx) => {
      const socket = this.getSocket(ctx.socketId);
      socket?.emit(event, data);
    });
  }

  /**
   * Send to specific socket
   */
  sendToSocket(socketId: string, event: string, data: any): void {
    const socket = this.getSocket(socketId);
    socket?.emit(event, data);
  }

  /**
   * Get server statistics
   */
  getStats(): {
    totalConnections: number;
    authenticatedUsers: number;
    uniqueUsers: number;
  } {
    const contexts = Array.from(this.connectedSockets.values());
    const authenticatedContexts = contexts.filter((ctx) => ctx.userId);
    const uniqueUsers = new Set(authenticatedContexts.map((ctx) => ctx.userId)).size;

    return {
      totalConnections: contexts.length,
      authenticatedUsers: authenticatedContexts.length,
      uniqueUsers,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (!this.io) return;

    logger.info('Shutting down WebSocket server...');

    // Notify all clients about shutdown
    this.io.emit('system:maintenance', {
      message: 'Server is shutting down for maintenance',
    });

    // Close all connections
    this.io.close();
    this.connectedSockets.clear();

    logger.info('WebSocket server shut down successfully');
  }
}
