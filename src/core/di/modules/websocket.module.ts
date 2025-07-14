// src/core/di/modules/websocket.module.ts
import { BaseModule } from './base.module';
import { DependencyContainer } from 'tsyringe';
import { SocketServer } from '../../../infrastructure/websocket/server/socket.server';
import { config } from '../../config';
import { TOKENS } from '../tokens';

export class WebSocketModule extends BaseModule {
  constructor() {
    super('WebSocketModule');
  }

  register(container: DependencyContainer): void {
    try {
      this.log('Registering WebSocket services...');

      // Always register SocketServer, but it can be disabled internally
      container.registerSingleton(TOKENS.SocketServer, SocketServer);
      this.log('Registered SocketServer');

      // Register other services if enabled
      if (config.websocket.enabled) {
        this.log('WebSocket enabled - registering additional services');
        // Add other websocket services here when you create them
      } else {
        this.log('WebSocket disabled - SocketServer registered but not started');
      }

      this.log('WebSocket services registered successfully');
    } catch (error) {
      this.logError('Failed to register WebSocket services', error);
      throw error; // Don't silently fail if required by other services
    }
  }
}
