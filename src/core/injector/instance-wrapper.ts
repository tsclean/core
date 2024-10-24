import { iterate } from 'iterare'
import { STATIC_CONTEXT } from './constants'
import { Module } from './module'
import {
  ClassProvider,
  FactoryProvider,
  InjectionToken,
  Scope,
  Type,
  ValueProvider
} from '../../contracts'
import {
  randomStringGenerator,
  isNil,
  isUndefined,
  isString,
  clc
} from '../../utils'
import { InstanceTokenType, ProviderType } from '../../types'
import { Logger, LoggerService } from '../../services'
import { EnhancerSubtype } from '../../helpers'

export const INSTANCE_METADATA_SYMBOL = Symbol.for('instance_metadata:cache')
export const INSTANCE_ID_SYMBOL = Symbol.for('instance_metadata:id')

export interface HostComponentInfo {
  token: InjectionToken
  isTreeDurable: boolean
}

export interface ContextId {
  readonly id: number,
  payload?: unknown;
  getParent?(info: HostComponentInfo): ContextId;
}

export interface InstancePerContext<T> {
  instance: T
  isResolved?: boolean
  isPending?: boolean
  donePromise?: Promise<void>
}

export interface PropertyMetadata {
  key: string
  wrapper: InstanceWrapper
}

interface InstanceMetadataStore {
  dependencies?: InstanceWrapper[]
  properties?: PropertyMetadata[]
  enhancers?: InstanceWrapper[]
}

export class InstanceWrapper<T = any> {
  public readonly name: any
  public readonly token: InstanceTokenType
  public readonly async?: boolean
  public readonly host?: Module
  public readonly isAlias: boolean = false
  public readonly subtype?: EnhancerSubtype;

  public scope?: Scope = Scope.DEFAULT
  public metaType: Type<T> | Function
  public inject?: (string | symbol | Function | Type<any>)[]
  public durable?: boolean;
  public initTime?: number;
  public forwardRef?: boolean

  private static logger: LoggerService = new Logger(InstanceWrapper.name)

  private readonly values = new WeakMap<ContextId, InstancePerContext<T>>()
  private readonly [INSTANCE_METADATA_SYMBOL]: InstanceMetadataStore = {}
  private readonly [INSTANCE_ID_SYMBOL]: string
  private transientMap?:
    | Map<string, WeakMap<ContextId, InstancePerContext<T>>>
    | undefined
  private isTreeStatic: boolean | undefined
  private isTreeDurable: boolean | undefined

  constructor (
    metadata: Partial<InstanceWrapper<T>> & Partial<InstancePerContext<T>> = {}
  ) {
    this[INSTANCE_ID_SYMBOL] = randomStringGenerator()
    this.initialize(metadata)
  }

  get id (): string {
    return this[INSTANCE_ID_SYMBOL]
  }

  set instance (value: T) {
    this.values.set(STATIC_CONTEXT, { instance: value })
  }

  get instance (): T {
    const instancePerContext = this.getInstanceByContextId(STATIC_CONTEXT)
    return instancePerContext.instance
  }

  get isNotMetatype (): boolean {
    const isFactory = this.metaType && !isNil(this.inject)
    return !this.metaType || isFactory
  }

  get isTransient (): boolean {
    return this.scope === Scope.TRANSIENT
  }

  public getInstanceByContextId (
    contextId: ContextId,
    inquirerId?: string
  ): InstancePerContext<T> {
    if (this.scope === Scope.TRANSIENT && inquirerId) {
      return this.getInstanceByInquirerId(contextId, inquirerId)
    }
    const instancePerContext = this.values.get(contextId)
    return instancePerContext
      ? instancePerContext
      : this.cloneStaticInstance(contextId)
  }

  public getInstanceByInquirerId (
    contextId: ContextId,
    inquirerId: string
  ): InstancePerContext<T> {
    let collectionPerContext = this.transientMap.get(inquirerId)
    if (!collectionPerContext) {
      collectionPerContext = new WeakMap()
      this.transientMap.set(inquirerId, collectionPerContext)
    }
    const instancePerContext = collectionPerContext.get(contextId)
    return instancePerContext
      ? instancePerContext
      : this.cloneTransientInstance(contextId, inquirerId)
  }

  public setInstanceByContextId (
    contextId: ContextId,
    value: InstancePerContext<T>,
    inquirerId?: string
  ) {
    if (this.scope === Scope.TRANSIENT && inquirerId) {
      return this.setInstanceByInquirerId(contextId, inquirerId, value)
    }
    this.values.set(contextId, value)
  }

  public setInstanceByInquirerId (
    contextId: ContextId,
    inquirerId: string,
    value: InstancePerContext<T>
  ) {
    let collection = this.transientMap.get(inquirerId)
    if (!collection) {
      collection = new WeakMap()
      this.transientMap.set(inquirerId, collection)
    }
    collection.set(contextId, value)
  }

  public addCtorMetadata (index: number, wrapper: InstanceWrapper) {
    if (!this[INSTANCE_METADATA_SYMBOL].dependencies) {
      this[INSTANCE_METADATA_SYMBOL].dependencies = []
    }
    this[INSTANCE_METADATA_SYMBOL].dependencies[index] = wrapper
  }

  public getCtorMetadata (): InstanceWrapper[] {
    return this[INSTANCE_METADATA_SYMBOL].dependencies
  }

  public addPropertiesMetadata (key: string, wrapper: InstanceWrapper) {
    if (!this[INSTANCE_METADATA_SYMBOL].properties) {
      this[INSTANCE_METADATA_SYMBOL].properties = []
    }
    this[INSTANCE_METADATA_SYMBOL].properties.push({
      key,
      wrapper
    })
  }

  public getPropertiesMetadata (): PropertyMetadata[] {
    return this[INSTANCE_METADATA_SYMBOL].properties
  }

  public addEnhancerMetadata (wrapper: InstanceWrapper) {
    if (!this[INSTANCE_METADATA_SYMBOL].enhancers) {
      this[INSTANCE_METADATA_SYMBOL].enhancers = []
    }
    this[INSTANCE_METADATA_SYMBOL].enhancers.push(wrapper)
  }

  public getEnhancersMetadata (): InstanceWrapper[] {
    return this[INSTANCE_METADATA_SYMBOL].enhancers
  }

  public isDependencyTreeDurable (lookupRegistry: string[] = []): boolean {
    if (!isUndefined(this.isTreeDurable)) {
      return this.isTreeDurable
    }
    if (this.scope === Scope.REQUEST) {
      this.isTreeDurable = this.durable === undefined ? false : this.durable
      if (this.isTreeDurable) {
        this.printIntrospectedAsDurable()
      }
      return this.isTreeDurable
    }
    const isStatic = this.isDependencyTreeStatic()
    if (isStatic) {
      return false
    }

    const isTreeNonDurable = this.introspectDepsAttribute(
      (collection, registry) =>
        collection.some(
          (item: InstanceWrapper) =>
            !item.isDependencyTreeStatic() &&
            !item.isDependencyTreeDurable(registry)
        ),
      lookupRegistry
    )
    this.isTreeDurable = !isTreeNonDurable
    if (this.isTreeDurable) {
      this.printIntrospectedAsDurable()
    }
    return this.isTreeDurable
  }

  public introspectDepsAttribute (
    callback: (
      collection: InstanceWrapper[],
      lookupRegistry: string[]
    ) => boolean,
    lookupRegistry: string[] = []
  ): boolean {
    if (lookupRegistry.includes(this[INSTANCE_ID_SYMBOL])) {
      return false
    }
    lookupRegistry = lookupRegistry.concat(this[INSTANCE_ID_SYMBOL])

    const { dependencies, properties, enhancers } =
      this[INSTANCE_METADATA_SYMBOL]

    let introspectionResult = dependencies
      ? callback(dependencies, lookupRegistry)
      : false

    if (introspectionResult || !(properties || enhancers)) {
      return introspectionResult
    }
    introspectionResult = properties
      ? callback(
          properties.map(item => item.wrapper),
          lookupRegistry
        )
      : false
    if (introspectionResult || !enhancers) {
      return introspectionResult
    }
    return enhancers ? callback(enhancers, lookupRegistry) : false
  }

  public isDependencyTreeStatic (lookupRegistry: string[] = []): boolean {
    if (!isUndefined(this.isTreeStatic)) {
      return this.isTreeStatic
    }
    if (this.scope === Scope.REQUEST) {
      this.isTreeStatic = false
      return this.isTreeStatic
    }
    if (lookupRegistry.includes(this[INSTANCE_ID_SYMBOL])) {
      return true
    }
    lookupRegistry = lookupRegistry.concat(this[INSTANCE_ID_SYMBOL])

    const { dependencies, properties, enhancers } =
      this[INSTANCE_METADATA_SYMBOL]
    let isStatic =
      (dependencies &&
        this.isWrapperListStatic(dependencies, lookupRegistry)) ||
      !dependencies

    if (!isStatic || !(properties || enhancers)) {
      this.isTreeStatic = isStatic
      return this.isTreeStatic
    }
    const propertiesHosts = (properties || []).map(item => item.wrapper)
    isStatic =
      isStatic && this.isWrapperListStatic(propertiesHosts, lookupRegistry)
    if (!isStatic || !enhancers) {
      this.isTreeStatic = isStatic
      return this.isTreeStatic
    }
    this.isTreeStatic = this.isWrapperListStatic(enhancers, lookupRegistry)
    return this.isTreeStatic
  }

  public cloneStaticInstance (contextId: ContextId): InstancePerContext<T> {
    const staticInstance = this.getInstanceByContextId(STATIC_CONTEXT)
    if (this.isDependencyTreeStatic()) {
      return staticInstance
    }
    const instancePerContext: InstancePerContext<T> = {
      ...staticInstance,
      instance: undefined,
      isResolved: false,
      isPending: false
    }
    if (this.isNewable()) {
      instancePerContext.instance = Object.create(this.metaType.prototype)
    }
    this.setInstanceByContextId(contextId, instancePerContext)
    return instancePerContext
  }

  public cloneTransientInstance (
    contextId: ContextId,
    inquirerId: string
  ): InstancePerContext<T> {
    const staticInstance = this.getInstanceByContextId(STATIC_CONTEXT)
    const instancePerContext: InstancePerContext<T> = {
      ...staticInstance,
      instance: undefined,
      isResolved: false,
      isPending: false
    }
    if (this.isNewable()) {
      instancePerContext.instance = Object.create(this.metaType.prototype)
    }
    this.setInstanceByInquirerId(contextId, inquirerId, instancePerContext)
    return instancePerContext
  }

  public createPrototype (contextId: ContextId) {
    const host = this.getInstanceByContextId(contextId)
    if (!this.isNewable() || host.isResolved) {
      return
    }
    return Object.create(this.metaType.prototype)
  }

  public isInRequestScope (
    contextId: ContextId,
    inquirer?: InstanceWrapper | undefined
  ): boolean {
    const isDependencyTreeStatic = this.isDependencyTreeStatic()

    return (
      !isDependencyTreeStatic &&
      contextId !== STATIC_CONTEXT &&
      (!this.isTransient || (this.isTransient && !!inquirer))
    )
  }

  public isLazyTransient (
    contextId: ContextId,
    inquirer: InstanceWrapper | undefined
  ): boolean {
    const isInquirerRequestScoped =
      inquirer && !inquirer.isDependencyTreeStatic()

    return (
      this.isDependencyTreeStatic() &&
      contextId !== STATIC_CONTEXT &&
      this.isTransient &&
      isInquirerRequestScoped
    )
  }

  public isExplicitlyRequested (
    contextId: ContextId,
    inquirer?: InstanceWrapper
  ): boolean {
    const isSelfRequested = inquirer === this
    return (
      this.isDependencyTreeStatic() &&
      contextId !== STATIC_CONTEXT &&
      (isSelfRequested || (inquirer && inquirer.scope === Scope.TRANSIENT))
    )
  }

  public isStatic (
    contextId: ContextId,
    inquirer: InstanceWrapper | undefined
  ): boolean {
    const isInquirerRequestScoped =
      inquirer && !inquirer.isDependencyTreeStatic()
    const isStaticTransient = this.isTransient && !isInquirerRequestScoped

    return (
      this.isDependencyTreeStatic() &&
      contextId === STATIC_CONTEXT &&
      (!this.isTransient ||
        (isStaticTransient && !!inquirer && !inquirer.isTransient))
    )
  }

  public getStaticTransientInstances () {
    if (!this.transientMap) {
      return []
    }
    const instances = [...this.transientMap.values()]
    return iterate(instances)
      .map(item => item.get(STATIC_CONTEXT))
      .filter(item => !!item)
      .toArray()
  }

  public mergeWith (provider: ProviderType) {
    if (!isUndefined((provider as ValueProvider).useValue)) {
      this.metaType = null
      this.inject = null
      this.scope = Scope.DEFAULT

      this.setInstanceByContextId(STATIC_CONTEXT, {
        instance: (provider as ValueProvider).useValue,
        isResolved: true,
        isPending: false
      })
    } else if ((provider as ClassProvider).useClass) {
      this.inject = null
      this.metaType = (provider as ClassProvider).useClass
    } else if ((provider as FactoryProvider).useFactory) {
      this.metaType = (provider as FactoryProvider).useFactory
      this.inject = (provider as FactoryProvider).inject || []
    }
  }

  private isNewable (): boolean {
    return isNil(this.inject) && this.metaType && this.metaType.prototype
  }

  private isWrapperListStatic (
    tree: InstanceWrapper[],
    lookupRegistry: string[]
  ): boolean {
    return tree.every((item: InstanceWrapper) =>
      item.isDependencyTreeStatic(lookupRegistry)
    )
  }

  private initialize (
    metadata: Partial<InstanceWrapper<T>> & Partial<InstancePerContext<T>>
  ) {
    const { instance, isResolved, ...wrapperPartial } = metadata
    Object.assign(this, wrapperPartial)

    this.setInstanceByContextId(STATIC_CONTEXT, {
      instance,
      isResolved
    })
    this.scope === Scope.TRANSIENT && (this.transientMap = new Map())
  }

  private isDebugMode (): boolean {
    return !!process.env.CLEAN_DEBUG
  }

  private printIntrospectedAsDurable () {
    if (!this.isDebugMode()) {
      return
    }
    if (isString(this.name)) {
      InstanceWrapper.logger.log(
        `${clc.cyanBright(this.name)}${clc.green(
          ' introspected as '
        )}${clc.magentaBright('durable')}`
      )
    }
  }
}
