// src/core/di/modules/controller.module.ts
import { BaseModule } from './base.module';
import { DependencyContainer, InjectionToken } from 'tsyringe';
import { AuthController } from '../../../api/v1/controller/auth.controller';
import { UserController } from '../../../api/v1/controller/user.controller';
import { OrganizationController } from '../../../api/v1/controller/organization.controller';

type Controller = new (...args: any[]) => any;

export class ControllerModule extends BaseModule {
  constructor() {
    super('ControllerModule');
  }

  register(container: DependencyContainer): void {
    this.log('Registering API controllers...');

    // Register all controllers as singletons
    const controllers: Controller[] = [
      AuthController,
      UserController,
      OrganizationController,
      // Add new controllers here as you create them
    ];

    controllers.forEach((ControllerClass) => {
      container.registerSingleton(ControllerClass as any);
      this.log(`Registered ${ControllerClass.name}`);
    });

    this.log('All API controllers registered');
  }
}