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

      // Only register if WebSocket is enabled
      if (!config.websocket.enabled) {
        this.log('WebSocket disabled by configuration, skipping registration');
        return;
      }

      // Register SocketServer as singleton
      container.registerSingleton(TOKENS.SocketServer, SocketServer);
      this.log('Registered SocketServer');

      // We'll add more services later:
      // container.registerSingleton(TOKENS.SocketService, SocketService);
      // container.registerSingleton(TOKENS.PresenceService, PresenceService);
      // container.registerSingleton(TOKENS.RoomService, RoomService);

      this.log('WebSocket services registered successfully');
    } catch (error) {
      this.logError('Failed to register WebSocket services', error);

      // WebSocket is optional, so we don't throw
      this.log('Continuing without WebSocket services...');
    }
  }
}
