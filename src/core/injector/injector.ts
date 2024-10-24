import { iterate } from 'iterare'
import { RuntimeException } from '../../errors/exceptions/runtime'
import { UndefinedDependencyException } from '../../errors/exceptions/undefined-dependency'
import { UnknownDependenciesException } from '../../errors/exceptions/unknown-dependencies'
import { STATIC_CONTEXT } from './constants'
import { INQUIRER } from './inquirer'
import {
  ContextId,
  InstancePerContext,
  InstanceWrapper,
  PropertyMetadata
} from './instance-wrapper'
import { Module } from './module'
import { Type } from '../../contracts'
import {
  isFunction,
  isNil,
  isObject,
  isString,
  isUndefined,
  clc
} from '../../utils'
import {
  OPTIONAL_DEPS_METADATA,
  OPTIONAL_PROPERTY_DEPS_METADATA,
  PARAMTYPES_METADATA,
  PROPERTY_DEPS_METADATA,
  SELF_DECLARED_DEPS_METADATA
} from '../../helpers'
import { Logger, LoggerService } from '../../services'
import { ControllerType, InjectableType, InstanceTokenType } from '../../types'

export type InjectorDependency = Type<any> | Function | string | symbol

export interface PropertyDependency {
  key: string
  name: InjectorDependency
  isOptional?: boolean
  instance?: any
}

export interface InjectorDependencyContext {
  key?: string | symbol

  name?: Function | string | symbol

  index?: number

  dependencies?: InjectorDependency[]
}

export class Injector {
  private logger: LoggerService = new Logger('InjectorLogger')

  constructor (private readonly options?: { preview: boolean }) {}

  public loadPrototype<T> (
    { token }: InstanceWrapper<T>,
    collection: Map<InstanceTokenType, InstanceWrapper<T>>,
    contextId = STATIC_CONTEXT
  ) {
    if (!collection) {
      return
    }
    const target = collection.get(token)
    const instance = target.createPrototype(contextId)
    if (instance) {
      const wrapper = new InstanceWrapper({
        ...target,
        instance
      })
      collection.set(token, wrapper)
    }
  }

  public async loadInstance<T> (
    wrapper: InstanceWrapper<T>,
    collection: Map<InstanceTokenType, InstanceWrapper>,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ) {
    const inquirerId = Injector.getInquirerId(inquirer)
    const instanceHost = wrapper.getInstanceByContextId(contextId, inquirerId)
    if (instanceHost.isPending) {
      return instanceHost.donePromise
    }
    const done = this.applyDoneHook(instanceHost)
    const token = wrapper.token || wrapper.name

    const { inject } = wrapper
    const targetWrapper = collection.get(token)
    if (isUndefined(targetWrapper)) {
      throw new RuntimeException()
    }
    if (instanceHost.isResolved) {
      return done()
    }
    const callback = async (instances: unknown[]) => {
      const properties = await this.resolveProperties(
        wrapper,
        moduleRef,
        inject,
        contextId,
        wrapper,
        inquirer
      )
      const instance = await this.instantiateClass(
        instances,
        wrapper,
        targetWrapper,
        contextId,
        inquirer
      )
      this.applyProperties(instance, properties)
      done()
    }
    await this.resolveConstructorParams<T>(
      wrapper,
      moduleRef,
      inject,
      callback,
      contextId,
      wrapper,
      inquirer
    )
  }

  public async loadMiddleware (
    wrapper: InstanceWrapper,
    collection: Map<InstanceTokenType, InstanceWrapper>,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ) {
    const { metaType, token } = wrapper
    const targetWrapper = collection.get(token)
    if (!isUndefined(targetWrapper.instance)) {
      return
    }
    targetWrapper.instance = Object.create(metaType.prototype)
    await this.loadInstance(
      wrapper,
      collection,
      moduleRef,
      contextId,
      inquirer || wrapper
    )
  }

  public async loadController (
    wrapper: InstanceWrapper<ControllerType>,
    moduleRef: Module,
    contextId = STATIC_CONTEXT
  ) {
    const controllers = moduleRef.controllers
    await this.loadInstance<ControllerType>(
      wrapper,
      controllers,
      moduleRef,
      contextId,
      wrapper
    )
    await this.loadEnhancersPerContext(wrapper, contextId, wrapper)
  }

  public async loadInjectable<T = any> (
    wrapper: InstanceWrapper<T>,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ) {
    const injectables = moduleRef.injectables
    await this.loadInstance<T>(
      wrapper,
      injectables,
      moduleRef,
      contextId,
      inquirer
    )
  }

  public async loadProvider (
    wrapper: InstanceWrapper<InjectableType>,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ) {
    const providers = moduleRef.providers
    await this.loadInstance<InjectableType>(
      wrapper,
      providers,
      moduleRef,
      contextId,
      inquirer
    )
    await this.loadEnhancersPerContext(wrapper, contextId, wrapper)
  }

  public applyDoneHook<T> (wrapper: InstancePerContext<T>): () => void {
    let done: () => void
    wrapper.donePromise = new Promise<void>((resolve, reject) => {
      done = resolve
    })
    wrapper.isPending = true
    return done
  }

  public async resolveConstructorParams<T> (
    wrapper: InstanceWrapper<T>,
    moduleRef: Module,
    inject: InjectorDependency[],
    callback: (args: unknown[]) => void | Promise<void>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    parentInquirer?: InstanceWrapper
  ) {
    let inquirerId = Injector.getInquirerId(inquirer)
    const metadata = wrapper.getCtorMetadata()

    if (metadata && contextId !== STATIC_CONTEXT) {
      const deps = await this.loadCtorMetadata(
        metadata,
        contextId,
        inquirer,
        parentInquirer
      )
      return callback(deps)
    }
    const dependencies = isNil(inject)
      ? this.reflectConstructorParams(wrapper.metaType as Type<any>)
      : inject
    const optionalDependenciesIds = isNil(inject)
      ? this.reflectOptionalParams(wrapper.metaType as Type<any>)
      : []

    let isResolved = true
    const resolveParam = async (param: unknown, index: number) => {
      try {
        if (Injector.isInquirer(param, parentInquirer)) {
          return parentInquirer && parentInquirer.instance
        }
        if (inquirer?.isTransient && parentInquirer) {
          inquirer = parentInquirer
          inquirerId = Injector.getInquirerId(parentInquirer)
        }
        const paramWrapper = await this.resolveSingleParam<T>(
          wrapper,
          param,
          { index, dependencies },
          moduleRef,
          contextId,
          inquirer,
          index
        )
        const instanceHost = paramWrapper.getInstanceByContextId(
          contextId,
          inquirerId
        )
        if (!instanceHost.isResolved && !paramWrapper.forwardRef) {
          isResolved = false
        }
        return instanceHost?.instance
      } catch (err) {
        const isOptional = optionalDependenciesIds.includes(index)
        if (!isOptional) {
          throw err
        }
        return undefined
      }
    }
    const instances = await Promise.all(dependencies.map(resolveParam))
    isResolved && (await callback(instances))
  }

  public reflectConstructorParams<T> (type: Type<T>): any[] {
    const paramtypes = Reflect.getMetadata(PARAMTYPES_METADATA, type) || []
    const selfParams = this.reflectSelfParams<T>(type)

    selfParams.forEach(({ index, param }) => (paramtypes[index] = param))
    return paramtypes
  }

  public reflectOptionalParams<T> (type: Type<T>): any[] {
    return Reflect.getMetadata(OPTIONAL_DEPS_METADATA, type) || []
  }

  public reflectSelfParams<T> (type: Type<T>): any[] {
    return Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, type) || []
  }

  public async resolveSingleParam<T> (
    wrapper: InstanceWrapper<T>,
    param: Type<any> | string | symbol | any,
    dependencyContext: InjectorDependencyContext,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: string | number
  ) {
    if (isUndefined(param)) {
      throw new UndefinedDependencyException(
        wrapper.name,
        dependencyContext,
        moduleRef
      )
    }
    const token = this.resolveParamToken(wrapper, param)
    return this.resolveComponentInstance<T>(
      moduleRef,
      token,
      dependencyContext,
      wrapper,
      contextId,
      inquirer,
      keyOrIndex
    )
  }

  public resolveParamToken<T> (
    wrapper: InstanceWrapper<T>,
    param: Type<any> | string | symbol | any
  ) {
    if (!param.forwardRef) {
      return param
    }
    wrapper.forwardRef = true
    return param.forwardRef()
  }

  public async resolveComponentInstance<T> (
    moduleRef: Module,
    token: InstanceTokenType,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: string | number
  ): Promise<InstanceWrapper> {
    this.printResolvingDependenciesLog(token, inquirer)
    this.printLookingForProviderLog(token, moduleRef)
    const providers = moduleRef.providers
    const instanceWrapper = await this.lookupComponent(
      providers,
      moduleRef,
      { ...dependencyContext, name: token },
      wrapper,
      contextId,
      inquirer,
      keyOrIndex
    )

    return this.resolveComponentHost(
      moduleRef,
      instanceWrapper,
      contextId,
      inquirer
    )
  }

  public async resolveComponentHost<T> (
    moduleRef: Module,
    instanceWrapper: InstanceWrapper<T | Promise<T>>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ): Promise<InstanceWrapper> {
    const inquirerId = Injector.getInquirerId(inquirer)
    const instanceHost = instanceWrapper.getInstanceByContextId(
      contextId,
      inquirerId
    )
    if (!instanceHost.isResolved && !instanceWrapper.forwardRef) {
      await this.loadProvider(instanceWrapper, moduleRef, contextId, inquirer)
    } else if (
      !instanceHost.isResolved &&
      instanceWrapper.forwardRef &&
      (contextId !== STATIC_CONTEXT || !!inquirerId)
    ) {
      /**
       * When circular dependency has been detected between
       * either request/transient providers, we have to asynchronously
       * resolve instance host for a specific contextId or inquirer, to ensure
       * that eventual lazily created instance will be merged with the prototype
       * instantiated beforehand.
       */
      instanceHost.donePromise &&
        instanceHost.donePromise.then(() =>
          this.loadProvider(instanceWrapper, moduleRef, contextId, inquirer)
        )
    }
    if (instanceWrapper.async) {
      const host = instanceWrapper.getInstanceByContextId(contextId, inquirerId)
      host.instance = await host.instance
      instanceWrapper.setInstanceByContextId(contextId, host, inquirerId)
    }
    return instanceWrapper
  }

  public async lookupComponent<T = any> (
    providers: Map<Function | string | symbol, InstanceWrapper>,
    moduleRef: Module,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: string | number
  ): Promise<InstanceWrapper<T>> {
    const { name } = dependencyContext
    if (wrapper && wrapper.name === name) {
      throw new UnknownDependenciesException(
        wrapper.name,
        dependencyContext,
        moduleRef
      )
    }
    if (providers.has(name)) {
      const instanceWrapper = providers.get(name)
      this.printFoundInModuleLog(name, moduleRef)
      Injector.addDependencyMetadata(keyOrIndex, wrapper, instanceWrapper)
      return instanceWrapper
    }
    return this.lookupComponentInParentModules(
      dependencyContext,
      moduleRef,
      wrapper,
      contextId,
      inquirer,
      keyOrIndex
    )
  }

  public async lookupComponentInParentModules<T = any> (
    dependencyContext: InjectorDependencyContext,
    moduleRef: Module,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: string | number
  ) {
    const instanceWrapper = await this.lookupComponentInImports(
      moduleRef,
      dependencyContext.name,
      wrapper,
      [],
      contextId,
      inquirer,
      keyOrIndex
    )
    if (isNil(instanceWrapper)) {
      throw new UnknownDependenciesException(
        wrapper.name,
        dependencyContext,
        moduleRef
      )
    }
    return instanceWrapper
  }

  public async lookupComponentInImports (
    moduleRef: Module,
    name: InstanceTokenType,
    wrapper: InstanceWrapper,
    moduleRegistry: any[] = [],
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: string | number,
    isTraversing?: boolean
  ): Promise<any> {
    let instanceWrapperRef: InstanceWrapper = null
    const imports = moduleRef.imports || new Set<Module>()
    const identity = (item: any) => item

    let children = [...imports.values()].filter(identity)
    if (isTraversing) {
      const contextModuleExports = moduleRef.exports
      children = children.filter(child =>
        contextModuleExports.has(child.metaType)
      )
    }
    for (const relatedModule of children) {
      if (moduleRegistry.includes(relatedModule.id)) {
        continue
      }
      this.printLookingForProviderLog(name, relatedModule)
      moduleRegistry.push(relatedModule.id)
      const { providers, exports } = relatedModule
      if (!exports.has(name) || !providers.has(name)) {
        const instanceRef = await this.lookupComponentInImports(
          relatedModule,
          name,
          wrapper,
          moduleRegistry,
          contextId,
          inquirer,
          keyOrIndex,
          true
        )
        if (instanceRef) {
          Injector.addDependencyMetadata(keyOrIndex, wrapper, instanceRef)
          return instanceRef
        }
        continue
      }
      this.printFoundInModuleLog(name, relatedModule)
      instanceWrapperRef = providers.get(name)
      Injector.addDependencyMetadata(keyOrIndex, wrapper, instanceWrapperRef)

      const inquirerId = Injector.getInquirerId(inquirer)
      const instanceHost = instanceWrapperRef.getInstanceByContextId(
        contextId,
        inquirerId
      )
      if (!instanceHost.isResolved && !instanceWrapperRef.forwardRef) {
        await this.loadProvider(
          instanceWrapperRef,
          relatedModule,
          contextId,
          wrapper
        )
        break
      }
    }
    return instanceWrapperRef
  }

  public async resolveProperties<T> (
    wrapper: InstanceWrapper<T>,
    moduleRef: Module,
    inject?: InjectorDependency[],
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    parentInquirer?: InstanceWrapper
  ): Promise<PropertyDependency[]> {
    if (!isNil(inject)) {
      return []
    }
    const metadata = wrapper.getPropertiesMetadata()
    if (metadata && contextId !== STATIC_CONTEXT) {
      return this.loadPropertiesMetadata(metadata, contextId, inquirer)
    }
    const properties = this.reflectProperties(wrapper.metaType as Type<any>)
    const instances = await Promise.all(
      properties.map(async (item: PropertyDependency) => {
        try {
          const dependencyContext = {
            key: item.key,
            name: item.name as Function | string | symbol
          }
          if (Injector.isInquirer(item.name, parentInquirer)) {
            return parentInquirer && parentInquirer.instance
          }
          const paramWrapper = await this.resolveSingleParam<T>(
            wrapper,
            item.name,
            dependencyContext,
            moduleRef,
            contextId,
            inquirer,
            item.key
          )
          if (!paramWrapper) {
            return undefined
          }
          const inquirerId = Injector.getInquirerId(inquirer)
          const instanceHost = paramWrapper.getInstanceByContextId(
            contextId,
            inquirerId
          )
          return instanceHost.instance
        } catch (err) {
          if (!item.isOptional) {
            throw err
          }
          return undefined
        }
      })
    )
    return properties.map((item: PropertyDependency, index: number) => ({
      ...item,
      instance: instances[index]
    }))
  }

  public reflectProperties<T> (type: Type<T>): PropertyDependency[] {
    const properties = Reflect.getMetadata(PROPERTY_DEPS_METADATA, type) || []
    const optionalKeys: string[] =
      Reflect.getMetadata(OPTIONAL_PROPERTY_DEPS_METADATA, type) || []

    return properties.map((item: any) => ({
      ...item,
      name: item.type,
      isOptional: optionalKeys.includes(item.key)
    }))
  }

  public applyProperties<T = any> (
    instance: T,
    properties: PropertyDependency[]
  ): void {
    if (!isObject(instance)) {
      return undefined
    }
    iterate(properties)
      .filter(item => !isNil(item.instance))
      .forEach(item => (instance[item.key] = item.instance))
  }

  public async instantiateClass<T = any> (
    instances: any[],
    wrapper: InstanceWrapper,
    targetMetatype: InstanceWrapper,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ): Promise<T> {
    const { metaType, inject } = wrapper
    const inquirerId = Injector.getInquirerId(inquirer)
    const instanceHost = targetMetatype.getInstanceByContextId(
      contextId,
      inquirerId
    )
    const isInContext =
      wrapper.isStatic(contextId, inquirer) ||
      wrapper.isInRequestScope(contextId, inquirer) ||
      wrapper.isLazyTransient(contextId, inquirer) ||
      wrapper.isExplicitlyRequested(contextId, inquirer)

    if (this.options?.preview && !wrapper.host?.initOnPreview) {
      instanceHost.isResolved = true
      return instanceHost.instance
    }

    if (isNil(inject) && isInContext) {
      instanceHost.instance = wrapper.forwardRef
        ? Object.assign(
            instanceHost.instance,
            new (metaType as Type<any>)(...instances)
          )
        : new (metaType as Type<any>)(...instances)
    } else if (isInContext) {
      const factoryReturnValue = (targetMetatype.metaType as any as Function)(
        ...instances
      )
      instanceHost.instance = await factoryReturnValue
    }
    instanceHost.isResolved = true
    return instanceHost.instance
  }

  public async loadPerContext<T = any> (
    instance: T,
    moduleRef: Module,
    collection: Map<InstanceTokenType, InstanceWrapper>,
    ctx: ContextId,
    wrapper?: InstanceWrapper
  ): Promise<T> {
    if (!wrapper) {
      const injectionToken = instance.constructor
      wrapper = collection.get(injectionToken)
    }
    await this.loadInstance(wrapper, collection, moduleRef, ctx, wrapper)
    await this.loadEnhancersPerContext(wrapper, ctx, wrapper)

    const host = wrapper.getInstanceByContextId(ctx, wrapper.id)
    return host && (host.instance as T)
  }

  public async loadEnhancersPerContext (
    wrapper: InstanceWrapper,
    ctx: ContextId,
    inquirer?: InstanceWrapper
  ) {
    const enhancers = wrapper.getEnhancersMetadata() || []
    const loadEnhancer = (item: InstanceWrapper) => {
      const hostModule = item.host
      return this.loadInstance(
        item,
        hostModule.injectables,
        hostModule,
        ctx,
        inquirer
      )
    }
    await Promise.all(enhancers.map(loadEnhancer))
  }

  public async loadCtorMetadata (
    metadata: InstanceWrapper<any>[],
    contextId: ContextId,
    inquirer?: InstanceWrapper,
    parentInquirer?: InstanceWrapper
  ): Promise<any[]> {
    const hosts = await Promise.all(
      metadata.map(async item =>
        this.resolveScopedComponentHost(
          item,
          contextId,
          inquirer,
          parentInquirer
        )
      )
    )
    const inquirerId = Injector.getInquirerId(inquirer)
    return hosts.map(
      item => item.getInstanceByContextId(contextId, inquirerId).instance
    )
  }

  public async loadPropertiesMetadata (
    metadata: PropertyMetadata[],
    contextId: ContextId,
    inquirer?: InstanceWrapper
  ): Promise<PropertyDependency[]> {
    const dependenciesHosts = await Promise.all(
      metadata.map(async ({ wrapper: item, key }) => ({
        key,
        host: await this.resolveComponentHost(
          item.host,
          item,
          contextId,
          inquirer
        )
      }))
    )
    const inquirerId = Injector.getInquirerId(inquirer)
    return dependenciesHosts.map(({ key, host }) => ({
      key,
      name: key,
      instance: host.getInstanceByContextId(contextId, inquirerId).instance
    }))
  }

  private static getInquirerId (inquirer: InstanceWrapper | undefined): string {
    return inquirer && inquirer.id
  }

  private resolveScopedComponentHost (
    item: InstanceWrapper,
    contextId: ContextId,
    inquirer?: InstanceWrapper,
    parentInquirer?: InstanceWrapper
  ) {
    return Injector.isInquirerRequest(item, parentInquirer)
      ? parentInquirer
      : this.resolveComponentHost(item.host, item, contextId, inquirer)
  }

  private static isInquirerRequest (
    item: InstanceWrapper,
    parentInquirer: InstanceWrapper | undefined
  ) {
    return item.isTransient && item.name === INQUIRER && parentInquirer
  }

  private static isInquirer (
    param: unknown,
    parentInquirer: InstanceWrapper | undefined
  ) {
    return param === INQUIRER && parentInquirer
  }

  private static addDependencyMetadata (
    keyOrIndex: number | string,
    hostWrapper: InstanceWrapper,
    instanceWrapper: InstanceWrapper
  ) {
    isString(keyOrIndex)
      ? hostWrapper.addPropertiesMetadata(keyOrIndex, instanceWrapper)
      : hostWrapper.addCtorMetadata(keyOrIndex, instanceWrapper)
  }

  private static getTokenName (token: InstanceTokenType): string {
    return isFunction(token) ? (token as Function).name : token.toString()
  }

  private printResolvingDependenciesLog (
    token: InstanceTokenType,
    inquirer?: InstanceWrapper
  ): void {
    if (!Injector.isDebugMode()) {
      return
    }
    const tokenName = Injector.getTokenName(token)
    const dependentName = inquirer?.name ?? 'unknown'
    const isAlias = dependentName === tokenName

    const messageToPrint = `Resolving dependency ${clc.cyanBright(
      tokenName
    )}${clc.green(' in the ')}${clc.yellow(dependentName)}${clc.green(
      ` provider ${isAlias ? '(alias)' : ''}`
    )}`

    this.logger.log(messageToPrint)
  }

  private printLookingForProviderLog (
    token: InstanceTokenType,
    moduleRef: Module
  ): void {
    if (!Injector.isDebugMode()) {
      return
    }
    const tokenName = Injector.getTokenName(token)
    const moduleRefName = moduleRef?.metaType?.name ?? 'unknown'
    this.logger.log(
      `Looking for ${clc.cyanBright(tokenName)}${clc.green(
        ' in '
      )}${clc.magentaBright(moduleRefName)}`
    )
  }

  private printFoundInModuleLog (
    token: InstanceTokenType,
    moduleRef: Module
  ): void {
    if (!Injector.isDebugMode()) {
      return
    }
    const tokenName = Injector.getTokenName(token)
    const moduleRefName = moduleRef?.metaType?.name ?? 'unknown'
    this.logger.log(
      `Found ${clc.cyanBright(tokenName)}${clc.green(
        ' in '
      )}${clc.magentaBright(moduleRefName)}`
    )
  }

  private static isDebugMode (): boolean {
    return !!process.env.NEST_DEBUG
  }
}
