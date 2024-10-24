import { ApplicationConfig } from '../../app'
import {
  CircularDependencyException,
  UndefinedForwardRefException,
  UnknownModuleException
} from '../../errors'
import { REQUEST } from '../../router'
import { ModuleCompiler } from './compiler'
import { ContextId } from './instance-wrapper'
import { InternalCoreModule } from './internal-core-module'
import { InternalProvidersStorage } from './internal-providers-storage'
import { Module } from './module'
import { ModuleTokenFactory } from './module-token-factory'
import { ModulesContainer } from './modules-container'
import { DynamicModuleInterface, Type } from '../../contracts'
import { EnhancerSubtype, GLOBAL_MODULE_METADATA } from '../../helpers'
import { InjectableType, ProviderType } from '../../types'
import { SerializedGraph } from '../../inspector/serialized-graph'
import { DiscoverableMetaHostCollection } from '../../core/discovery'

export class ContainerIoC {
  private readonly globalModules = new Set<Module>()
  private readonly moduleTokenFactory = new ModuleTokenFactory()
  private readonly moduleCompiler = new ModuleCompiler(this.moduleTokenFactory)
  private readonly modules = new ModulesContainer()
  private readonly dynamicModulesMetadata = new Map<
    string,
    Partial<DynamicModuleInterface>
  >()
  private readonly internalProvidersStorage = new InternalProvidersStorage()
  private readonly _serializedGraph = new SerializedGraph()
  private internalCoreModule: Module

  constructor (
    private readonly _applicationConfig: ApplicationConfig = undefined
  ) {}

  get serializedGraph (): SerializedGraph {
    return this._serializedGraph
  }

  get applicationConfig (): ApplicationConfig | undefined {
    return this._applicationConfig
  }

  public setHttpAdapter (httpAdapter: any) {
    this.internalProvidersStorage.httpAdapter = httpAdapter

    if (!this.internalProvidersStorage.httpAdapterHost) {
      return
    }
    const host = this.internalProvidersStorage.httpAdapterHost
    host.httpAdapter = httpAdapter
  }

  public getHttpAdapterRef () {
    return this.internalProvidersStorage.httpAdapter
  }

  public getHttpAdapterHostRef () {
    return this.internalProvidersStorage.httpAdapterHost
  }

  public async addModule (
    metaType:
      | Type<any>
      | DynamicModuleInterface
      | Promise<DynamicModuleInterface>,
    scope: Type<any>[]
  ): Promise<Module | undefined> {
    if (!metaType) throw new UndefinedForwardRefException(scope)

    const { type, dynamicMetadata, token } = await this.moduleCompiler.compile(
      metaType
    )
    if (this.modules.has(token)) return this.modules.get(token)

    const moduleRef = new Module(type, this)
    moduleRef.token = token
    this.modules.set(token, moduleRef)

    await this.addDynamicMetadata(
      token,
      dynamicMetadata,
      [].concat(scope, type)
    )

    if (this.isGlobalModule(type, dynamicMetadata)) {
      this.addGlobalModule(moduleRef)
    }
    return moduleRef
  }

  public async addDynamicMetadata (
    token: string,
    dynamicModuleMetadata: Partial<DynamicModuleInterface>,
    scope: Type<any>[]
  ) {
    if (!dynamicModuleMetadata) {
      return
    }
    this.dynamicModulesMetadata.set(token, dynamicModuleMetadata)

    const { imports } = dynamicModuleMetadata
    await this.addDynamicModules(imports, scope)
  }

  public async addDynamicModules (modules: any[], scope: Type<any>[]) {
    if (!modules) {
      return
    }
    await Promise.all(modules.map(module => this.addModule(module, scope)))
  }

  public isGlobalModule (
    metatype: Type<any>,
    dynamicMetadata?: Partial<DynamicModuleInterface>
  ): boolean {
    if (dynamicMetadata && dynamicMetadata.global) {
      return true
    }
    return !!Reflect.getMetadata(GLOBAL_MODULE_METADATA, metatype)
  }

  public addGlobalModule (module: Module) {
    this.globalModules.add(module)
  }

  public getModules (): ModulesContainer {
    return this.modules
  }

  public getModuleCompiler (): ModuleCompiler {
    return this.moduleCompiler
  }

  public getModuleByKey (moduleKey: string): Module {
    return this.modules.get(moduleKey)
  }

  public getInternalCoreModuleRef (): Module | undefined {
    return this.internalCoreModule
  }

  public async addImport (
    relatedModule: Type<any> | DynamicModuleInterface,
    token: string
  ) {
    if (!this.modules.has(token)) {
      return
    }
    const moduleRef = this.modules.get(token)
    const { token: relatedModuleToken } = await this.moduleCompiler.compile(
      relatedModule
    )
    const related = this.modules.get(relatedModuleToken)
    moduleRef.addRelatedModule(related)
  }

  public addProvider (
    provider: ProviderType,
    token: string,
    enhancerSubtype?: EnhancerSubtype,
  ): string | symbol | Function {
    const moduleRef = this.modules.get(token);
    if (!provider) {
      throw new CircularDependencyException(moduleRef?.metaType.name);
    }
    if (!moduleRef) {
      throw new UnknownModuleException();
    }
    const providerKey = moduleRef.addProvider(provider, enhancerSubtype);
    const providerRef = moduleRef.getProviderByKey(providerKey);

    DiscoverableMetaHostCollection.inspectProvider(this.modules, providerRef);

    return providerKey as Function;
  }

  public addInjectable (
    injectable: ProviderType,
    token: string,
    enhancerSubtype: EnhancerSubtype,
    host?: Type<InjectableType>
  ) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException()
    }
    const moduleRef = this.modules.get(token)
    return moduleRef.addInjectable(injectable, enhancerSubtype, host);
  }

  public addExportedProvider (provider: Type<any>, token: string) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException()
    }
    const moduleRef = this.modules.get(token)
    moduleRef.addExportedProvider(provider)
  }

  public addController (controller: Type<any>, token: string) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException()
    }
    const moduleRef = this.modules.get(token)
    moduleRef.addController(controller)
  }

  public clear () {
    this.modules.clear()
  }

  public replace (toReplace: any, options: any & { scope: any[] | null }) {
    this.modules.forEach(moduleRef => moduleRef.replace(toReplace, options))
  }

  public bindGlobalScope () {
    this.modules.forEach(moduleRef => this.bindGlobalsToImports(moduleRef))
  }

  public bindGlobalsToImports (moduleRef: Module) {
    this.globalModules.forEach(globalModule =>
      this.bindGlobalModuleToModule(moduleRef, globalModule)
    )
  }

  public bindGlobalModuleToModule (target: Module, globalModule: Module) {
    if (target === globalModule || target === this.internalCoreModule) {
      return
    }
    target.addRelatedModule(globalModule)
  }

  public getDynamicMetadataByToken(token: string): Partial<DynamicModuleInterface>;
  public getDynamicMetadataByToken<
    K extends Exclude<keyof DynamicModuleInterface, 'global' | 'module'>,
  >(token: string, metadataKey: K): DynamicModuleInterface[K];

  public getDynamicMetadataByToken (
    token: string,
    metadataKey?: Exclude<keyof DynamicModuleInterface, 'global' | 'module'>,
  ) {
    const metadata = this.dynamicModulesMetadata.get(token);
    return metadataKey ? (metadata?.[metadataKey] ?? []) : metadata;
  }

  public registerCoreModuleRef (moduleRef: Module) {
    this.internalCoreModule = moduleRef
    this.modules[InternalCoreModule.name] = moduleRef
  }

  public getModuleTokenFactory (): ModuleTokenFactory {
    return this.moduleTokenFactory
  }

  public registerRequestProvider<T = any> (request: T, contextId: ContextId) {
    const wrapper = this.internalCoreModule.getProviderByKey(REQUEST)
    wrapper.setInstanceByContextId(contextId, {
      instance: request,
      isResolved: true
    })
  }
}
