// src/core/di/decorators/injectable.decorator.ts
import { injectable as tsyringeInjectable, singleton, scoped, Lifecycle } from 'tsyringe';

export type InjectableLifecycle = 'transient' | 'singleton' | 'scoped' | 'container-scoped';

export interface InjectableOptions {
  lifecycle?: InjectableLifecycle;
  token?: symbol;
}

/**
 * Enhanced @injectable decorator that wraps tsyringe's decorators
 * and adds additional metadata
 */
export function Injectable(options?: InjectableOptions): ClassDecorator {
  return (target: any) => {
    // Store metadata about the service
    Reflect.defineMetadata('custom:injectable', true, target);
    Reflect.defineMetadata('custom:lifecycle', options?.lifecycle || 'singleton', target);

    if (options?.token) {
      Reflect.defineMetadata('custom:token', options.token, target);
    }

    // Apply the appropriate tsyringe decorator
    switch (options?.lifecycle) {
      case 'transient':
        tsyringeInjectable()(target);
        break;
      case 'scoped':
        scoped(Lifecycle.ResolutionScoped)(target);
        break;
      case 'container-scoped':
        scoped(Lifecycle.ContainerScoped)(target);
        break;
      case 'singleton':
      default:
        singleton()(target);
        break;
    }

    return target;
  };
}

/**
 * Alias decorators for specific lifecycles
 */
export const Singleton = () => Injectable({ lifecycle: 'singleton' });
export const Transient = () => Injectable({ lifecycle: 'transient' });
export const Scoped = () => Injectable({ lifecycle: 'scoped' });
export const ContainerScoped = () => Injectable({ lifecycle: 'container-scoped' });

/**
 * Service decorator - alias for singleton services
 */
export const Service = () => Injectable({ lifecycle: 'singleton' });

/**
 * Repository decorator - alias for singleton repositories
 */
export const Repository = () => Injectable({ lifecycle: 'singleton' });

/**
 * Handler decorator - for event handlers (usually transient)
 */
export const Handler = () => Injectable({ lifecycle: 'transient' });
