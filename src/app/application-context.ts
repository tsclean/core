import { UnknownModuleException } from '../errors'
import { createContextId } from '../helpers'
import {
  ModuleCompiler,
  ContainerIoC,
  Injector,
  InstanceLinksHost,
  ContextId,
  Module,
  AbstractInstanceResolver
} from '../core'
import {
  AbstractInterface,
  DynamicModuleInterface,
  ApplicationContextInterface,
  Type,
  ApplicationContextOptionsInterface,
  GetOrResolveOptions
} from '../contracts'
import { Logger, LoggerService, LogLevel } from '../services'

export class ApplicationContext<
    TOptions extends ApplicationContextOptionsInterface = ApplicationContextOptionsInterface
  >
  extends AbstractInstanceResolver
  implements ApplicationContextInterface
{
  protected isInitialized = false
  protected injector: Injector
  protected readonly logger = new Logger(ApplicationContext.name, {
    timestamp: true
  })

  private shouldFlushLogsOnOverride = false
  private readonly moduleCompiler = new ModuleCompiler()
  private _instanceLinksHost: InstanceLinksHost

  get instanceLinksHost () {
    if (!this._instanceLinksHost) {
      this._instanceLinksHost = new InstanceLinksHost(this.container)
    }
    return this._instanceLinksHost
  }

  constructor (
    protected readonly container: ContainerIoC,
    protected readonly appOptions: TOptions = {} as TOptions,
    private readonly scope = new Array<Type<any>>(),
    private contextModule: Module = null
  ) {
    super()
    this.injector = new Injector()

    if (this.appOptions.preview) {
      this.printInPreviewModeWarning()
    }
  }

  public selectContextModule () {
    const modules = this.container.getModules().values()
    this.contextModule = modules.next().value
  }

  public select<T> (
    moduleType: Type<T> | DynamicModuleInterface
  ): ApplicationContextInterface {
    const modulesContainer = this.container.getModules()
    const contextModuleCtor = this.contextModule.metaType
    const scope = this.scope.concat(contextModuleCtor)

    const moduleTokenFactory = this.container.getModuleTokenFactory()
    const { type, dynamicMetadata } =
      this.moduleCompiler.extractMetadata(moduleType)
    const token = moduleTokenFactory.create(type, dynamicMetadata)

    const selectedModule = modulesContainer.get(token)
    if (!selectedModule) throw new UnknownModuleException()

    return new ApplicationContext(
      this.container,
      this.appOptions,
      scope,
      selectedModule
    )
  }

  public get<T = any, R = T> (
    typeOrToken: Type<T> | AbstractInterface<T> | string | symbol,
    options: GetOrResolveOptions = { strict: false }
  ): R | Array<R> {
    return !(options && options.strict)
      ? this.find<T, R>(typeOrToken, options)
      : this.find<T, R>(typeOrToken, {
          moduleId: this.contextModule?.id,
          each: options.each
        })
  }

  public resolve<T = any, R = T> (
    typeOrToken: Type<T> | AbstractInterface<T> | string | symbol,
    contextId = createContextId(),
    options: GetOrResolveOptions = { strict: false }
  ): Promise<R | Array<R>> {
    return this.resolvePerContext<T, R>(
      typeOrToken,
      this.contextModule,
      contextId,
      options
    )
  }

  public registerRequestByContextId<T = any> (request: T, contextId: ContextId) {
    this.container.registerRequestProvider(request, contextId)
  }

  public async init (): Promise<this> {
    if (this.isInitialized) return this

    this.isInitialized = true
    return this
  }

  public async close (): Promise<void> {
    await this.dispose()
  }

  public useLogger (logger: LoggerService | LogLevel[] | false) {
    Logger.overrideLogger(logger)
    if (this.shouldFlushLogsOnOverride) {
      this.flushLogs()
    }
  }

  public flushLogs () {
    Logger.flush()
  }

  public flushLogsOnOverride () {
    this.shouldFlushLogsOnOverride = true
  }

  protected async dispose (): Promise<void> {
    return Promise.resolve()
  }

  private printInPreviewModeWarning () {
    this.logger.warn('------------------------------------------------')
    this.logger.warn('Application is running in the PREVIEW mode!')
    this.logger.warn('Providers/controllers will not be instantiated.')
    this.logger.warn('------------------------------------------------')
  }
}
