import { DependencyContainer } from 'tsyringe';

export interface IModule {
  register(container: DependencyContainer): Promise<void> | void;
}
