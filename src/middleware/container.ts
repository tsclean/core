import {InstanceTokenType} from "../types";
import {SCOPE_OPTIONS_METADATA} from "../helpers";
import { ContainerIoC, InstanceWrapper } from '../core';
import {MiddlewareConfigurationInterface, Scope, Type} from "../contracts";

export class MiddlewareContainer {
  private readonly middleware = new Map<string, Map<InstanceTokenType, InstanceWrapper>>();
  private readonly configurationSets = new Map<string, Set<MiddlewareConfigurationInterface>>();

  constructor(
      private readonly container: ContainerIoC
  ) {}

  public getMiddlewareCollection(moduleKey: string): Map<InstanceTokenType, InstanceWrapper> {
    if (!this.middleware.has(moduleKey)) {
      const moduleRef = this.container.getModuleByKey(moduleKey);
      this.middleware.set(moduleKey, moduleRef.middlewares);
    }
    return this.middleware.get(moduleKey);
  }

  public getConfigurations(): Map<string, Set<MiddlewareConfigurationInterface>> {
    return this.configurationSets;
  }

  public insertConfig(configList: MiddlewareConfigurationInterface[], moduleKey: string) {
    const middleware = this.getMiddlewareCollection(moduleKey);
    const targetConfig = this.getTargetConfig(moduleKey);

    const configurations = configList || [];
    const insertMiddleware = <T extends Type<unknown>>(metaType: T) => {
      const token = metaType;
      middleware.set(
        token,
        new InstanceWrapper({
          scope: MiddlewareContainer.getClassScope(metaType),
          name: token,
          metaType,
          token,
        }),
      );
    };
    configurations.forEach(config => {
      [].concat(config.middleware).map(insertMiddleware);
      targetConfig.add(config);
    });
  }

  private getTargetConfig(moduleName: string) {
    if (!this.configurationSets.has(moduleName)) {
      this.configurationSets.set(
        moduleName,
        new Set<MiddlewareConfigurationInterface>(),
      );
    }
    return this.configurationSets.get(moduleName);
  }

  private static getClassScope<T = unknown>(type: Type<T>): Scope {
    const metadata = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, type);
    return metadata && metadata.scope;
  }
}
