// src/core/di/decorators/inject.decorator.ts
import { inject as tsyringeInject } from 'tsyringe';
import { TOKENS } from '../tokens';

/**
 * Enhanced @inject decorator that provides better type safety
 * and token management
 */
export function Inject(token: symbol | string): ParameterDecorator & PropertyDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    if (propertyKey === undefined && parameterIndex !== undefined) {
      // Constructor parameter injection
      const existingTokens = Reflect.getMetadata('custom:inject:params', target) || [];
      existingTokens[parameterIndex] = token;
      Reflect.defineMetadata('custom:inject:params', existingTokens, target);

      // Return the tsyringe inject decorator for parameters
      return tsyringeInject(token)(target, propertyKey as any, parameterIndex);
    } else if (propertyKey !== undefined && parameterIndex === undefined) {
      // Property injection
      Reflect.defineMetadata('custom:inject:property', token, target, propertyKey);

      // For property injection, we need to handle it differently
      const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);

      // Apply tsyringe inject for properties
      tsyringeInject(token)(target, propertyKey, descriptor as any);
    }
  };
}

/**
 * Alternative implementation that's cleaner
 */
export function InjectToken(token: symbol | string) {
  // Return tsyringe's inject directly but with type safety
  return tsyringeInject(token) as ParameterDecorator & PropertyDecorator;
}

/**
 * Token-specific inject decorators for common services
 */
export const InjectDatabase = () => InjectToken(TOKENS.Database);
export const InjectCache = () => InjectToken(TOKENS.CacheService);
export const InjectLogger = () => InjectToken(TOKENS.Logger);
export const InjectEventBus = () => InjectToken(TOKENS.EventBus);
export const InjectConfig = () => InjectToken(TOKENS.Config);

// Repository injectors
export const InjectUserRepository = () => InjectToken(TOKENS.UserRepository);
export const InjectAuthRepository = () => InjectToken(TOKENS.AuthRepository);
export const InjectOrganizationRepository = () => InjectToken(TOKENS.OrganizationRepository);

// Service injectors
export const InjectUserService = () => InjectToken(TOKENS.UserService);
export const InjectAuthService = () => InjectToken(TOKENS.AuthService);
export const InjectEmailService = () => InjectToken(TOKENS.EmailService);
export const InjectQueueManager = () => InjectToken(TOKENS.QueueManager);
