// src/core/di/modules/base.module.ts
import { DependencyContainer } from 'tsyringe';
import { logger } from '../../../shared/utils';

export interface IModule {
  register(container: DependencyContainer): Promise<void> | void;
  getName(): string;
}

export abstract class BaseModule implements IModule {
  protected readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract register(container: DependencyContainer): Promise<void> | void;

  getName(): string {
    return this.name;
  }

  protected log(message: string): void {
    logger.info(`[${this.name}] ${message}`);
  }

  protected logError(message: string, error: unknown): void {
    logger.error(`[${this.name}] ${message}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

// Optional: Module registry to track what's been registered
export class ModuleRegistry {
  private static modules: Map<string, IModule> = new Map();
  private static registered: Set<string> = new Set();

  static register(module: IModule): void {
    if (this.modules.has(module.getName())) {
      throw new Error(`Module ${module.getName()} already registered`);
    }
    this.modules.set(module.getName(), module);
  }

  static async load(container: DependencyContainer, module: IModule): Promise<void> {
    if (this.registered.has(module.getName())) {
      logger.warn(`Module ${module.getName()} already loaded, skipping`);
      return;
    }

    await module.register(container);
    this.registered.add(module.getName());
  }

  static getModules(): IModule[] {
    return Array.from(this.modules.values());
  }

  static isLoaded(moduleName: string): boolean {
    return this.registered.has(moduleName);
  }

  static clear(): void {
    this.modules.clear();
    this.registered.clear();
  }
}
