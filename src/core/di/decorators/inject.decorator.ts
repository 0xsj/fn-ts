// src/core/di/decorators/inject.decorator.ts
import { inject as tsyringeInject, InjectionToken } from 'tsyringe';
import { TOKENS } from '../tokens';
import 'reflect-metadata';

/**
 * Enhanced inject decorator that supports both explicit tokens and type reflection
 *
 * Usage:
 * - @Inject() - Uses TypeScript metadata to resolve the type
 * - @Inject(TOKENS.UserService) - Uses explicit token (backward compatible)
 * - @Inject('CONFIG') - Uses string token (backward compatible)
 */
export function Inject<T = any>(token?: InjectionToken<T>): ParameterDecorator & PropertyDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    // Property injection
    if (propertyKey !== undefined && parameterIndex === undefined) {
      if (token) {
        return tsyringeInject(token)(target, propertyKey, undefined as any);
      }

      // For property injection without token, get the type
      const propertyType = Reflect.getMetadata('design:type', target, propertyKey);
      if (!propertyType) {
        throw new Error(
          `Cannot inject property ${String(propertyKey)} in ${target.constructor.name}. ` +
            `No type metadata found. Make sure emitDecoratorMetadata is enabled.`,
        );
      }

      return tsyringeInject(propertyType)(target, propertyKey, undefined as any);
    }

    // Constructor parameter injection
    if (propertyKey === undefined && parameterIndex !== undefined) {
      if (token) {
        // Explicit token provided - use existing behavior
        return tsyringeInject(token)(target, propertyKey as any, parameterIndex);
      }

      // No token - use type reflection
      const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
      const paramType = paramTypes[parameterIndex];

      if (!paramType) {
        throw new Error(
          `Cannot inject parameter at index ${parameterIndex} in ${target.name}. ` +
            `No type metadata found. Make sure emitDecoratorMetadata is enabled.`,
        );
      }

      // Check if we have a registered mapping for this type
      const typeToken = getTokenForType(paramType);

      if (typeToken) {
        // Use the mapped token
        return tsyringeInject(typeToken)(target, propertyKey as any, parameterIndex);
      }

      // Use the constructor itself as the token
      return tsyringeInject(paramType)(target, propertyKey as any, parameterIndex);
    }
  };
}

/**
 * Type to token mapping for interfaces and abstract classes
 * This allows us to map interfaces to their implementation tokens
 */
const typeToTokenMap = new Map<Function, InjectionToken<any>>();

/**
 * Register a type to token mapping
 * Used during container initialization
 */
export function registerTypeMapping(type: Function, token: InjectionToken<any>): void {
  typeToTokenMap.set(type, token);
}

/**
 * Get the token for a given type
 */
function getTokenForType(type: Function): InjectionToken<any> | undefined {
  return typeToTokenMap.get(type);
}

/**
 * Decorator to mark a class as injectable with a specific token
 * This helps with interface-based injection
 */
export function InjectableAs(token: InjectionToken<any>): ClassDecorator {
  return (target: any) => {
    registerTypeMapping(target, token);
    return target;
  };
}

// ============================================
// Backward Compatible Token-Specific Decorators
// ============================================

/**
 * @deprecated Use @Inject() without parameters instead
 * Kept for backward compatibility
 */
export function InjectToken(token: symbol | string) {
  return tsyringeInject(token) as ParameterDecorator & PropertyDecorator;
}

/**
 * @deprecated Use @Inject() without parameters instead
 * Token-specific inject decorators for common services
 */
export const InjectDatabase = () => Inject(TOKENS.Database);
export const InjectCache = () => Inject(TOKENS.CacheService);
export const InjectLogger = () => Inject(TOKENS.Logger);
export const InjectEventBus = () => Inject(TOKENS.EventBus);
export const InjectConfig = () => Inject(TOKENS.Config);

// Repository injectors - kept for backward compatibility
export const InjectUserRepository = () => Inject(TOKENS.UserRepository);
export const InjectAuthRepository = () => Inject(TOKENS.AuthRepository);
export const InjectOrganizationRepository = () => Inject(TOKENS.OrganizationRepository);

// Service injectors - kept for backward compatibility
export const InjectUserService = () => Inject(TOKENS.UserService);
export const InjectAuthService = () => Inject(TOKENS.AuthService);
export const InjectOrganizationService = () => Inject(TOKENS.OrganizationService);
export const InjectEmailService = () => Inject(TOKENS.EmailService);
export const InjectQueueManager = () => Inject(TOKENS.QueueManager);

// ============================================
// Helper decorators for optional injection
// ============================================

/**
 * Mark a dependency as optional
 * The dependency will be undefined if not available
 */
export function Optional<T = any>(token?: InjectionToken<T>): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    // Mark as optional
    const optionalMetadata = Reflect.getMetadata('custom:optional', target) || [];
    optionalMetadata[parameterIndex] = true;
    Reflect.defineMetadata('custom:optional', optionalMetadata, target);

    // Apply regular injection
    return Inject(token)(target, propertyKey, parameterIndex);
  };
}

/**
 * Inject all implementations of a token as an array
 */
export function InjectAll<T = any>(token: InjectionToken<T>): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    // This would need to be handled in the container
    Reflect.defineMetadata('custom:inject-all', token, target, `param:${parameterIndex}`);
    return target;
  };
}
