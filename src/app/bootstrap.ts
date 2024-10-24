import {
  AbstractHttpAdapter,
  InstanceLoader,
  ContainerIoC,
  Injector
} from '../core'
import { ApplicationConfig } from './application-config'
import { MESSAGES } from './constants'
import { ExceptionsZone } from '../errors'
import { loadAdapter, rethrow } from '../helpers'
import { MetadataScanner } from './metadata-scanner'
import { Application } from './application'
import { DependenciesScanner } from './scanner'
import {
  HttpServer,
  ApplicationInterface,
  ApplicationOptionsInterface,
  ApplicationContextOptionsInterface,
  ApplicationContextInterface
} from '../contracts'
import { isFunction, isNil } from '../utils'
import { Logger } from '../services'
import {
  NoopGraphInspector,
  GraphInspector,
  UuidFactory,
  UuidFactoryMode
} from '../inspector'
import { ApplicationContext } from './application-context'

export class BootstrapInitProject {
  private readonly logger = new Logger(null, { timestamp: true })
  private abortOnError = true
  private autoFlushLogs = false

  public async create<T extends ApplicationInterface = ApplicationInterface>(
    module: any,
    options?: ApplicationOptionsInterface
  ): Promise<T>

  public async create<T extends ApplicationInterface = ApplicationInterface>(
    module: any,
    httpAdapter: AbstractHttpAdapter,
    options?: ApplicationOptionsInterface
  ): Promise<T>

  public async create<T extends ApplicationInterface = ApplicationInterface> (
    module: any,
    serverOrOptions?: AbstractHttpAdapter | ApplicationOptionsInterface,
    options?: ApplicationOptionsInterface
  ): Promise<T> {
    const [httpServer, appOptions] = this.isHttpServer(serverOrOptions)
      ? [serverOrOptions, options]
      : [this.createHttpAdapter(), serverOrOptions]

    const applicationConfig = new ApplicationConfig()
    const container = new ContainerIoC(applicationConfig)
    const graphInspector = this.createGraphInspector(appOptions, container)

    this.setAbortOnError(serverOrOptions, options)
    this.registerLoggerConfiguration(appOptions)

    await this.initialize(
      module,
      container,
      graphInspector,
      applicationConfig,
      appOptions,
      httpServer
    )

    const instance = new Application(
      container,
      httpServer,
      applicationConfig,
      graphInspector,
      appOptions
    )
    const target = this.createCleanInstance(instance)
    return this.createAdapterProxy<T>(target, httpServer)
  }

  public async createApplicationContext (
    moduleCls: any,
    options?: ApplicationContextOptionsInterface
  ): Promise<ApplicationContextInterface> {
    const applicationConfig = new ApplicationConfig()
    const container = new ContainerIoC(applicationConfig)
    const graphInspector = this.createGraphInspector(options, container)

    this.setAbortOnError(options)
    this.registerLoggerConfiguration(options)

    await this.initialize(
      moduleCls,
      container,
      graphInspector,
      applicationConfig,
      options
    )

    const modules = container.getModules().values()
    const root = modules.next().value

    const context = this.createCleanInstance<ApplicationContext>(
      new ApplicationContext(container, options, root)
    )
    if (this.autoFlushLogs) {
      context.flushLogsOnOverride()
    }
    return context.init()
  }

  private createCleanInstance<T> (instance: T): T {
    return this.createProxy(instance)
  }

  private async initialize (
    module: any,
    container: ContainerIoC,
    graphInspector: GraphInspector,
    config = new ApplicationConfig(),
    options: ApplicationContextOptionsInterface = {},
    httpServer: HttpServer = null
  ) {
    UuidFactory.mode = options.snapshot
      ? UuidFactoryMode.Deterministic
      : UuidFactoryMode.Random

    const injector = new Injector({ preview: options.preview })
    const instanceLoader = new InstanceLoader(
      container,
      injector,
      graphInspector
    )
    const metadataScanner = new MetadataScanner()
    const dependenciesScanner = new DependenciesScanner(
      container,
      metadataScanner,
      graphInspector,
      config
    )
    container.setHttpAdapter(httpServer)

    const teardown = this.abortOnError === false ? rethrow : undefined
    await httpServer?.init()
    try {
      this.logger.log(MESSAGES.APPLICATION_START)

      await ExceptionsZone.asyncRun(
        async () => {
          await dependenciesScanner.scan(module)
          await instanceLoader.createInstancesOfDependencies()
          dependenciesScanner.applyApplicationProviders()
        },
        teardown,
        this.autoFlushLogs
      )
    } catch (e) {
      this.handleInitializationError(e)
    }
  }

  private handleInitializationError (err: unknown) {
    if (this.abortOnError) process.abort()
    rethrow(err)
  }

  private createProxy (target: any) {
    const proxy = this.createExceptionProxy()
    return new Proxy(target, {
      get: proxy,
      set: proxy
    })
  }

  private createExceptionProxy () {
    return (receiver: Record<string, any>, prop: string) => {
      if (!(prop in receiver)) return
      if (isFunction(receiver[prop]))
        return this.createExceptionZone(receiver, prop)

      return receiver[prop]
    }
  }

  private createExceptionZone (
    receiver: Record<string, any>,
    prop: string
  ): Function {
    const teardown = this.abortOnError === false ? rethrow : undefined

    return (...args: unknown[]) => {
      let result: unknown
      ExceptionsZone.run(() => {
        result = receiver[prop](...args)
      }, teardown)

      return result
    }
  }

  protected registerLoggerConfiguration (
    options: ApplicationContextOptionsInterface | undefined
  ) {
    if (!options) return
    const { logger, bufferLogs, autoFlushLogs } = options
    if ((logger as boolean) !== true && !isNil(logger))
      Logger.overrideLogger(logger)

    if (bufferLogs) Logger.attachBuffer()

    this.autoFlushLogs = autoFlushLogs ?? true
  }

  private createHttpAdapter<T = any> (httpServer?: T): AbstractHttpAdapter {
    const { ExpressAdapter } = loadAdapter('express', 'HTTP', () =>
      require('../server')
    )
    return new ExpressAdapter(httpServer)
  }

  protected isHttpServer (
    serverOrOptions: AbstractHttpAdapter | ApplicationOptionsInterface
  ): serverOrOptions is AbstractHttpAdapter {
    return !!(serverOrOptions && (serverOrOptions as AbstractHttpAdapter).patch)
  }

  private setAbortOnError (
    serverOrOptions?: AbstractHttpAdapter | ApplicationOptionsInterface,
    options?: ApplicationContextOptionsInterface | ApplicationOptionsInterface
  ) {
    this.abortOnError = this.isHttpServer(serverOrOptions)
      ? !(options && options.abortOnError === false)
      : !(serverOrOptions && serverOrOptions.abortOnError === false)
  }

  private createAdapterProxy<T> (app: Application, adapter: HttpServer): T {
    const proxy = new Proxy(app, {
      get: (receiver: Record<string, any>, prop: string) => {
        const mapToProxy = (result: unknown) => {
          return result instanceof Promise
            ? result.then(mapToProxy)
            : result instanceof Application
            ? proxy
            : result
        }

        if (!(prop in receiver) && prop in adapter) {
          return (...args: unknown[]) => {
            const result = this.createExceptionZone(adapter, prop)(...args)
            return mapToProxy(result)
          }
        }
        if (isFunction(receiver[prop])) {
          return (...args: unknown[]) => {
            const result = receiver[prop](...args)
            return mapToProxy(result)
          }
        }
        return receiver[prop]
      }
    })
    return proxy as unknown as T
  }

  private createGraphInspector (
    appOptions: ApplicationContextOptionsInterface,
    container: ContainerIoC
  ) {
    return appOptions?.snapshot
      ? new GraphInspector(container)
      : NoopGraphInspector
  }
}

export const StartProjectInit = new BootstrapInitProject()
