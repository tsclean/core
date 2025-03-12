import { iterate } from 'iterare';
import { ApplicationConfig } from './application-config';
import { APP_FILTER, APP_HANDLER, APP_INTERCEPTOR, APP_RESOURCE } from './constants';
import {
  CircularDependencyException,
  InvalidModuleException,
  UndefinedModuleException
} from '../errors';
import { getClassScope } from '../helpers';
import {
  InstanceWrapper,
  InternalCoreModuleFactory,
  Module,
  ContainerIoC
} from '../core';
import { MetadataScanner } from './metadata-scanner';
import {
  ApplicationProviderWrapperInterface,
  AccessResourceInterface,
  ClassProvider,
  DynamicModuleInterface,
  ExceptionFilterInterface,
  ExistingProvider,
  FactoryProvider,
  ForwardReferenceInterface,
  InterceptorInterface,
  HandlerTransform,
  Scope,
  Type,
  ValueProvider
} from "../contracts";
import {
  EXCEPTION_FILTERS_METADATA,
  RESOURCES_METADATA,
  INTERCEPTORS_METADATA,
  MODULE_METADATA,
  HANDLER_METADATA, ROUTE_ARGS_METADATA
} from "../helpers";
import { isFunction, isNil, isUndefined, randomStringGenerator } from "../utils";
import { ControllerType, InjectableType, ProviderType } from "../types";

export class DependenciesScanner {
  private readonly applicationProvidersApplyMap: ApplicationProviderWrapperInterface[] = [];

  constructor(
    private readonly container: ContainerIoC,
    private readonly metadataScanner: MetadataScanner,
    private readonly applicationConfig = new ApplicationConfig(),
  ) {
  }

  public async scan(module: Type<any>) {
    await this.registerCoreModule();
    await this.scanForModules(module);
    await this.scanModulesForDependencies();
    await this.calculateModulesDistance();

    this.addScopedEnhancersMetadata();
    this.container.bindGlobalScope();
  }

  public async scanForModules(
    moduleDefinition:
      | ForwardReferenceInterface
      | Type<unknown>
      | DynamicModuleInterface
      | Promise<DynamicModuleInterface>,
    scope: Type<unknown>[] = [],
    ctxRegistry: (
      | ForwardReferenceInterface
      | DynamicModuleInterface
      | Type<unknown>)[] = []
  ): Promise<Module[]> {
    const moduleInstance = await this.insertModule(moduleDefinition, scope);
    moduleDefinition =
      moduleDefinition instanceof Promise
        ? await moduleDefinition
        : moduleDefinition;

    ctxRegistry.push(moduleDefinition);

    if (this.isForwardReference(moduleDefinition))
      moduleDefinition = (
        moduleDefinition as ForwardReferenceInterface)
        .forwardRef();

    const modules = !this.isDynamicModule(
      moduleDefinition as Type<any> | DynamicModuleInterface
    )
      ? this.reflectMetadata(
        moduleDefinition as Type<any>, MODULE_METADATA.IMPORTS
      )
      : [
        ...this.reflectMetadata(
          (moduleDefinition as DynamicModuleInterface).module,
          MODULE_METADATA.IMPORTS,
        ),
        ...((moduleDefinition as DynamicModuleInterface).imports || []),
      ];

    let registeredModuleRefs = [];
    for (const [index, innerModule] of modules.entries()) {

      if (innerModule === undefined)
        throw new UndefinedModuleException(moduleDefinition, index, scope);

      if (!innerModule) 
        throw new InvalidModuleException(moduleDefinition, index, scope);

      if (ctxRegistry.includes(innerModule)) {
        continue;
      }
      const moduleRefs = await this.scanForModules(
        innerModule, 
        [].concat(scope, moduleDefinition), 
        ctxRegistry
      );
      registeredModuleRefs = registeredModuleRefs.concat(moduleRefs);
    }
    if (!moduleInstance) {
      return registeredModuleRefs;
    }
    return [moduleInstance].concat(registeredModuleRefs);
  }

  public async insertModule(module: any, scope: Type<unknown>[]): Promise<Module | undefined> {
    if (module && module.forwardRef) return this.container.addModule(module.forwardRef(), scope);
    return this.container.addModule(module, scope);
  }

  public async scanModulesForDependencies(modules: Map<string, Module> = this.container.getModules()) {
    for (const [token, { metaType }] of modules) {
      await this.reflectImports(metaType, token, metaType.name);
      this.reflectProviders(metaType, token);
      this.reflectControllers(metaType, token);
      this.reflectExports(metaType, token);
    }
  }

  public async reflectImports(
    module: Type<unknown>, 
    token: string, 
    context: string
  ) {
    const modules = [
      ...this.reflectMetadata(module, MODULE_METADATA.IMPORTS),
      ...this.container.getDynamicMetadataByToken(
        token,
        MODULE_METADATA.IMPORTS as 'imports',
      ),
    ];
    for (const related of modules) {
      await this.insertImport(related, token, context);
    }
  }

  public reflectProviders(module: Type<any>, token: string) {
    const providers = [
      ...this.reflectMetadata(module, MODULE_METADATA.PROVIDERS),
      ...this.container.getDynamicMetadataByToken(
        token,
        MODULE_METADATA.PROVIDERS as 'providers',
      ),
    ];
    providers.forEach(provider => {
      this.insertProvider(provider, token);
      this.reflectDynamicMetadata(provider, token);
    });
  }

  public reflectControllers(module: Type<any>, token: string) {
    const controllers = [
      ...this.reflectMetadata(module, MODULE_METADATA.CONTROLLERS),
      ...this.container.getDynamicMetadataByToken(
        token,
        MODULE_METADATA.CONTROLLERS as 'controllers',
      ),
    ];
    controllers.forEach(item => {
      this.insertController(item, token);
      this.reflectDynamicMetadata(item, token);
    });
  }

  public reflectDynamicMetadata(obj: Type<InjectableType>, token: string) {
    if (!obj || !obj.prototype) {
      return;
    }
    this.reflectInjectables(obj, token, RESOURCES_METADATA);
    this.reflectInjectables(obj, token, INTERCEPTORS_METADATA);
    this.reflectInjectables(obj, token, EXCEPTION_FILTERS_METADATA);
    this.reflectInjectables(obj, token, HANDLER_METADATA);
    this.reflectParamInjectables(obj, token, ROUTE_ARGS_METADATA);
  }

  public reflectExports(module: Type<unknown>, token: string) {
    const exports = [
      ...this.reflectMetadata(module, MODULE_METADATA.EXPORTS),
      ...this.container.getDynamicMetadataByToken(
        token,
        MODULE_METADATA.EXPORTS as 'exports',
      ),
    ];
    exports.forEach(exportedProvider =>
      this.insertExportedProvider(exportedProvider, token),
    );
  }

  public reflectInjectables(
    component: Type<InjectableType>, 
    token: string, 
    metadataKey: string
  ) {
    const controllerInjectables = this.reflectMetadata(component, metadataKey);

    const methodsInjectables = this.metadataScanner.scanFromPrototype(null, component.prototype, this.reflectKeyMetadata.bind(this, component, metadataKey));

    const flattenMethodsInjectables = DependenciesScanner.flatten(methodsInjectables);
    const combinedInjectables = [
      ...controllerInjectables,
      ...flattenMethodsInjectables,
    ].filter(isFunction);
    const injectables = Array.from(new Set(combinedInjectables));

    injectables.forEach(injectable => this.insertInjectable(injectable, token, component));
  }

  public reflectParamInjectables(component: Type<InjectableType>, token: string, metadataKey: string) {
    const paramsMetadata = this.metadataScanner.scanFromPrototype(
      null, component.prototype, method => Reflect.getMetadata(metadataKey, component, method),
    );
    const paramsInjectables = DependenciesScanner.flatten(paramsMetadata).map(
      (param: Record<string, any>) =>
        DependenciesScanner.flatten(Object.keys(param).map(k => param[k].pipes)).filter(isFunction),
    );
    DependenciesScanner.flatten(paramsInjectables).forEach((injectable: Type<InjectableType>) => this.insertInjectable(injectable, token, component));
  }

  public reflectKeyMetadata(component: Type<InjectableType>, key: string, method: string) {
    let prototype = component.prototype;
    do {
      const descriptor = Reflect.getOwnPropertyDescriptor(prototype, method);
      if (!descriptor) continue;

      return Reflect.getMetadata(key, descriptor.value);
    } while (
      (prototype = Reflect.getPrototypeOf(prototype)) &&
      prototype !== Object.prototype &&
      prototype
    );
    return undefined;
  }

  public async calculateModulesDistance() {
    const modulesGenerator = this.container.getModules().values();

    modulesGenerator.next();

    const modulesStack = [];
    const calculateDistance = (moduleRef: Module, distance = 1) => {
      if (modulesStack.includes(moduleRef)) return;

      modulesStack.push(moduleRef);

      const moduleImports = moduleRef.imports;
      moduleImports.forEach(importedModuleRef => {
        if (importedModuleRef) {
          importedModuleRef.distance = distance;
          calculateDistance(importedModuleRef, distance + 1);
        }
      });
    };

    const rootModule = modulesGenerator.next().value as Module;
    calculateDistance(rootModule);
  }

  public async insertImport(related: any, token: string, context: string) {
    if (isUndefined(related)) {
      throw new CircularDependencyException(context);
    }
    if (related && related.forwardRef) return this.container.addImport(related.forwardRef(), token);

    await this.container.addImport(related, token);
  }

  public isCustomProvider(provider: ProviderType): provider is ClassProvider
    | ValueProvider | FactoryProvider | ExistingProvider {
    return provider && !isNil((provider as any).provide);
  }

  public insertProvider(provider: ProviderType, token: string) {
    const isCustomProvider = this.isCustomProvider(provider);
    if (!isCustomProvider) return this.container.addProvider(provider as Type<any>, token);

    const applyProvidersMap = this.getApplyProvidersMap();
    const providersKeys = Object.keys(applyProvidersMap);
    const type = (
      provider as ClassProvider | ValueProvider | FactoryProvider | ExistingProvider
    ).provide;

    if (!providersKeys.includes(type as string)) return this.container.addProvider(provider as any, token);

    const providerToken = `${type as string
      } (UUID: ${randomStringGenerator()})`;

    let scope = (provider as ClassProvider | FactoryProvider).scope;
    if (isNil(scope) && (provider as ClassProvider).useClass) scope = getClassScope((provider as ClassProvider).useClass);

    this.applicationProvidersApplyMap.push({
      type,
      moduleKey: token,
      providerKey: providerToken,
      scope,
    });

    const newProvider = {
      ...provider,
      provide: providerToken,
      scope,
    } as ProviderType;

    const factoryOrClassProvider = newProvider as FactoryProvider | ClassProvider;
    if (DependenciesScanner.isRequestOrTransient(factoryOrClassProvider.scope)) return this.container.addInjectable(newProvider, token);

    this.container.addProvider(newProvider, token);
  }

  public insertInjectable(injectable: Type<InjectableType>, token: string, host: Type<InjectableType>) {
    this.container.addInjectable(injectable, token, host);
  }

  public insertExportedProvider(exportedProvider: Type<InjectableType>, token: string) {
    this.container.addExportedProvider(exportedProvider, token);
  }

  public insertController(controller: Type<ControllerType>, token: string) {
    this.container.addController(controller, token);
  }

  public reflectMetadata(metaType: Type<any>, metadataKey: string) {
    return Reflect.getMetadata(metadataKey, metaType) || [];
  }

  public async registerCoreModule() {
    const moduleDefinition = InternalCoreModuleFactory.create(
      this.container, this, this.container.getModuleCompiler(), this.container.getHttpAdapterHostRef()
    );
    const [instance] = await this.scanForModules(moduleDefinition);
    this.container.registerCoreModuleRef(instance);
  }

  public addScopedEnhancersMetadata() {
    iterate(this.applicationProvidersApplyMap)
      .filter(wrapper => DependenciesScanner.isRequestOrTransient(wrapper.scope))
      .forEach(({ moduleKey, providerKey }) => {
        const modulesContainer = this.container.getModules();
        const { injectables } = modulesContainer.get(moduleKey);
        const instanceWrapper = injectables.get(providerKey);

        iterate(modulesContainer.values())
          .map(module => module.controllers.values())
          .flatten()
          .forEach(controller =>
            controller.addEnhancerMetadata(instanceWrapper),
          );
      });
  }

  public applyApplicationProviders() {
    const applyProvidersMap = this.getApplyProvidersMap();
    const applyRequestProvidersMap = this.getApplyRequestProvidersMap();

    const getInstanceWrapper = (
      moduleKey: string, providerKey: string, collectionKey: 'providers' | 'injectables') => {
      const modules = this.container.getModules();
      const collection = modules.get(moduleKey)[collectionKey];
      return collection.get(providerKey);
    };

    this.applicationProvidersApplyMap.forEach(
      ({ moduleKey, providerKey, type, scope }) => {
        let instanceWrapper: InstanceWrapper;
        if (DependenciesScanner.isRequestOrTransient(scope)) {
          instanceWrapper = getInstanceWrapper(
            moduleKey, providerKey, 'injectables');
          return applyRequestProvidersMap[type as string](instanceWrapper);
        }
        instanceWrapper = getInstanceWrapper(
          moduleKey, providerKey, 'providers');
        applyProvidersMap[type as string](instanceWrapper.instance);
      },
    );
  }

  public getApplyProvidersMap(): { [type: string]: Function } {
    return {
      [APP_INTERCEPTOR]: (interceptor: InterceptorInterface) =>
        this.applicationConfig.addGlobalInterceptor(interceptor),
      [APP_HANDLER]: (handler: HandlerTransform) =>
        this.applicationConfig.addGlobalHandler(handler),
      [APP_RESOURCE]: (guard: AccessResourceInterface) =>
        this.applicationConfig.addGlobalAccessResource(guard),
      [APP_FILTER]: (filter: ExceptionFilterInterface) =>
        this.applicationConfig.addGlobalFilter(filter),
    };
  }

  public getApplyRequestProvidersMap(): { [type: string]: Function } {
    return {
      [APP_INTERCEPTOR]: (interceptor: InstanceWrapper<InterceptorInterface>) =>
        this.applicationConfig.addGlobalRequestInterceptor(interceptor),
      [APP_HANDLER]: (handler: InstanceWrapper<HandlerTransform>) =>
        this.applicationConfig.addGlobalRequestHandler(handler),
      [APP_RESOURCE]: (guard: InstanceWrapper<AccessResourceInterface>) =>
        this.applicationConfig.addGlobalRequestGuard(guard),
      [APP_FILTER]: (filter: InstanceWrapper<ExceptionFilterInterface>) =>
        this.applicationConfig.addGlobalRequestFilter(filter),
    };
  }

  public isDynamicModule(module: Type<any> | DynamicModuleInterface): module is DynamicModuleInterface {
    return module && !!(module as DynamicModuleInterface).module;
  }

  public isForwardReference(
    module: Type<any>
      | DynamicModuleInterface
      | ForwardReferenceInterface): module is ForwardReferenceInterface {
    return module && !!(module as ForwardReferenceInterface).forwardRef;
  }

  private static flatten<T = any>(arr: T[][]): T[] {
    return arr.reduce((a: T[], b: T[]) => a.concat(b), []);
  }

  private static isRequestOrTransient(scope: Scope): boolean {
    return scope === Scope.REQUEST || scope === Scope.TRANSIENT;
  }
}
