import { Injector } from '../core/injector/injector';
import { InstanceWrapper } from '../core/injector/instance-wrapper';
import { Module } from '../core/injector/module';
import { MiddlewareContainer } from './container';
import {InstanceTokenType} from "../types";

export class MiddlewareResolver {
  private readonly instanceLoader = new Injector();

  constructor(private readonly middlewareContainer: MiddlewareContainer) {}

  public async resolveInstances(moduleRef: Module, moduleName: string) {
    const middleware =
      this.middlewareContainer.getMiddlewareCollection(moduleName);
    const resolveInstance = async (wrapper: InstanceWrapper) =>
      this.resolveMiddlewareInstance(wrapper, middleware, moduleRef);
    await Promise.all([...middleware.values()].map(resolveInstance));
  }

  private async resolveMiddlewareInstance(
    wrapper: InstanceWrapper,
    middleware: Map<InstanceTokenType, InstanceWrapper>,
    moduleRef: Module,
  ) {
    await this.instanceLoader.loadMiddleware(wrapper, middleware, moduleRef);
  }
}
