import { isRequestMethodAll } from '../router/utils'
import { ApplicationConfig } from '../app/application-config'
import { InvalidMiddlewareException } from '../errors/exceptions/invalid-middleware'
import { RuntimeException } from '../errors/exceptions/runtime'
import { ContextIdFactory } from '../helpers'
import { ExecutionContextHost } from '../helpers/execution-context-host'
import { STATIC_CONTEXT } from '../core/injector/constants'
import { ContainerIoC, ContextId } from '../core/injector'
import { Injector } from '../core/injector/injector'
import { InstanceWrapper } from '../core/injector/instance-wrapper'
import { Module } from '../core/injector/module'
import { REQUEST_CONTEXT_ID } from '../router/request/request-constants'
import { RouterExceptionFilters } from '../router/router-exception-filters'
import { RouterProxy } from '../router/router-proxy'
import { MiddlewareBuilder } from './builder'
import { MiddlewareContainer } from './container'
import { MiddlewareResolver } from './resolver'
import { RoutesMapper } from './routes-mapper'
import {
  ApplicationContextOptionsInterface,
  HttpServer,
  MiddlewareConfigurationInterface,
  MiddlewareInterface,
  RouteInfo
} from '../contracts'
import { addLeadingSlash, isUndefined } from '../utils'
import { RequestMethod } from '../enums'
import { InstanceTokenType } from '../types'
import { Logger } from '../services'
import { GraphInspector } from '../inspector'
import { RouteInfoPathExtractor } from './route-info-path-extractor'

export class MiddlewareModule<
  TAppOptions extends ApplicationContextOptionsInterface = ApplicationContextOptionsInterface
> {
  private readonly routerProxy = new RouterProxy()
  private readonly exceptionFiltersCache = new WeakMap()
  private readonly logger = new Logger(MiddlewareModule.name)

  private injector: Injector
  private routerExceptionFilter: RouterExceptionFilters
  private routesMapper: RoutesMapper
  private resolver: MiddlewareResolver
  private container: ContainerIoC
  private httpAdapter: HttpServer
  private graphInspector: GraphInspector
  private appOptions: TAppOptions
  private routeInfoPathExtractor: RouteInfoPathExtractor

  public async register (
    middlewareContainer: MiddlewareContainer,
    container: ContainerIoC,
    config: ApplicationConfig,
    injector: Injector,
    httpAdapter: HttpServer,
    graphInspector: GraphInspector,
    options: TAppOptions
  ) {
    this.appOptions = options

    const appRef = container.getHttpAdapterRef()
    this.routerExceptionFilter = new RouterExceptionFilters(
      container,
      config,
      appRef
    )
    this.routesMapper = new RoutesMapper(container, config)
    this.resolver = new MiddlewareResolver(middlewareContainer)
    this.routeInfoPathExtractor = new RouteInfoPathExtractor(config)

    this.injector = injector
    this.container = container
    this.httpAdapter = httpAdapter
    this.graphInspector = graphInspector

    const modules = container.getModules()
    await this.resolveMiddleware(middlewareContainer, modules)
  }

  public async resolveMiddleware (
    middlewareContainer: MiddlewareContainer,
    modules: Map<string, Module>
  ) {
    const moduleEntries = [...modules.entries()]
    const loadMiddlewareConfiguration = async ([moduleName, moduleRef]: [
      string,
      Module
    ]) => {
      await this.loadConfiguration(middlewareContainer, moduleRef, moduleName)
      await this.resolver.resolveInstances(moduleRef, moduleName)
    }
    await Promise.all(moduleEntries.map(loadMiddlewareConfiguration))
  }

  public async loadConfiguration (
    middlewareContainer: MiddlewareContainer,
    moduleRef: Module,
    moduleKey: string
  ) {
    const { instance } = moduleRef
    if (!instance.configure) {
      return
    }
    const middlewareBuilder = new MiddlewareBuilder(
      this.routesMapper,
      this.httpAdapter
    )
    await instance.configure(middlewareBuilder)

    if (!(middlewareBuilder instanceof MiddlewareBuilder)) {
      return
    }
    const config = middlewareBuilder.build()
    middlewareContainer.insertConfig(config, moduleKey)
  }

  public async registerMiddleware (
    middlewareContainer: MiddlewareContainer,
    applicationRef: any
  ) {
    const configs = middlewareContainer.getConfigurations()
    const registerAllConfigs = async (
      moduleKey: string,
      middlewareConfig: MiddlewareConfigurationInterface[]
    ) => {
      for (const config of middlewareConfig) {
        await this.registerMiddlewareConfig(
          middlewareContainer,
          config,
          moduleKey,
          applicationRef
        )
      }
    }

    const entriesSortedByDistance = [...configs.entries()].sort(
      ([moduleA], [moduleB]) => {
        return (
          this.container.getModuleByKey(moduleA).distance -
          this.container.getModuleByKey(moduleB).distance
        )
      }
    )
    for (const [moduleRef, moduleConfigurations] of entriesSortedByDistance) {
      await registerAllConfigs(moduleRef, [...moduleConfigurations])
    }
  }

  public async registerMiddlewareConfig (
    middlewareContainer: MiddlewareContainer,
    config: MiddlewareConfigurationInterface,
    moduleKey: string,
    applicationRef: any
  ) {
    const { forRoutes } = config
    for (const routeInfo of forRoutes) {
      await this.registerRouteMiddleware(
        middlewareContainer,
        routeInfo as RouteInfo,
        config,
        moduleKey,
        applicationRef
      )
    }
  }

  public async registerRouteMiddleware (
    middlewareContainer: MiddlewareContainer,
    routeInfo: RouteInfo,
    config: MiddlewareConfigurationInterface,
    moduleKey: string,
    applicationRef: any
  ) {
    const middlewareCollection = [].concat(config.middleware)
    const moduleRef = this.container.getModuleByKey(moduleKey)

    for (const metatype of middlewareCollection) {
      const collection = middlewareContainer.getMiddlewareCollection(moduleKey)
      const instanceWrapper = collection.get(metatype)
      if (isUndefined(instanceWrapper)) {
        throw new RuntimeException()
      }
      if (instanceWrapper.isTransient) {
        return
      }
      await this.bindHandler(
        instanceWrapper,
        applicationRef,
        routeInfo,
        moduleRef,
        collection
      )
    }
  }

  private async bindHandler (
    wrapper: InstanceWrapper<MiddlewareInterface>,
    applicationRef: HttpServer,
    routeInfo: RouteInfo,
    moduleRef: Module,
    collection: Map<InstanceTokenType, InstanceWrapper>
  ) {
    const { instance, metaType } = wrapper
    if (isUndefined(instance?.use)) {
      throw new InvalidMiddlewareException(metaType.name)
    }
    const isStatic = wrapper.isDependencyTreeStatic()
    if (isStatic) {
      const proxy = await this.createProxy(instance)
      return this.registerHandler(applicationRef, routeInfo, proxy)
    }

    const isTreeDurable = wrapper.isDependencyTreeDurable()

    await this.registerHandler(
      applicationRef,
      routeInfo,
      async <TRequest, TResponse>(
        req: TRequest,
        res: TResponse,
        next: () => void
      ) => {
        try {
          const contextId = this.getContextId(req, isTreeDurable)
          const contextInstance = await this.injector.loadPerContext(
            instance,
            moduleRef,
            collection,
            contextId
          )
          const proxy = await this.createProxy<TRequest, TResponse>(
            contextInstance,
            contextId
          )
          return proxy(req, res, next)
        } catch (err) {
          let exceptionsHandler = this.exceptionFiltersCache.get(instance.use)
          if (!exceptionsHandler) {
            exceptionsHandler = this.routerExceptionFilter.create(
              instance,
              instance.use,
              undefined
            )
            this.exceptionFiltersCache.set(instance.use, exceptionsHandler)
          }
          const host = new ExecutionContextHost([req, res, next])
          exceptionsHandler.next(err, host)
        }
      }
    )
  }

  private async createProxy<TRequest = unknown, TResponse = unknown> (
    instance: MiddlewareInterface,
    contextId = STATIC_CONTEXT
  ): Promise<(req: TRequest, res: TResponse, next: () => void) => void> {
    const exceptionsHandler = this.routerExceptionFilter.create(
      instance,
      instance.use,
      undefined,
      contextId
    )
    const middleware = instance.use.bind(instance)
    return this.routerProxy.createProxy(middleware, exceptionsHandler)
  }

  private async registerHandler (
    applicationRef: HttpServer,
    routeInfo: RouteInfo,
    proxy: <TRequest, TResponse>(
      req: TRequest,
      res: TResponse,
      next: () => void
    ) => void
  ) {
    const { method } = routeInfo
    const paths = this.routeInfoPathExtractor.extractPathsFrom(routeInfo)
    const isMethodAll = isRequestMethodAll(method)
    const requestMethod = RequestMethod[method]
    const router = await applicationRef.createMiddlewareFactory(method)
    const middlewareFunction = isMethodAll
      ? proxy
      : <TRequest, TResponse>(
          req: TRequest,
          res: TResponse,
          next: () => void
        ) => {
          if (applicationRef.getRequestMethod(req) === requestMethod) {
            return proxy(req, res, next)
          }
          return next()
        }
    const pathsToApplyMiddleware = []
    paths.some(path => path.match(/^\/?$/))
      ? pathsToApplyMiddleware.push('/')
      : pathsToApplyMiddleware.push(...paths)
    pathsToApplyMiddleware.forEach(path => router(path, middlewareFunction))
  }

  private getContextId (request: unknown, isTreeDurable: boolean): ContextId {
    const contextId = ContextIdFactory.getByRequest(request)
    if (!request[REQUEST_CONTEXT_ID]) {
      Object.defineProperty(request, REQUEST_CONTEXT_ID, {
        value: contextId,
        enumerable: false,
        writable: false,
        configurable: false
      })

      const requestProviderValue = isTreeDurable ? contextId.payload : request
      this.container.registerRequestProvider(requestProviderValue, contextId)
    }
    return contextId
  }
}
