import { platform } from 'os'
import pathToRegexp from 'path-to-regexp'
import { AbstractHttpAdapter, ContainerIoC, Injector } from '../core'
import { ApplicationConfig } from './application-config'
import { MESSAGES } from './constants'
import { mapToExcludeRoute, MiddlewareContainer, MiddlewareModule } from '../middleware'
import { ApplicationContext } from './application-context'
import {
  AccessResourceInterface,
  ExceptionFilterInterface,
  HttpServer,
  ApplicationInterface,
  ApplicationOptionsInterface,
  InterceptorInterface,
  GlobalPrefixOptionsInterface,
  RouteInfo,
  ResolverInterface,
  ExcludeRouteMetadataInterface,
  CorsOptions,
  CorsOptionsDelegate,
  HandlerTransform,
  WebSocketAdapter
} from '../contracts'
import { addLeadingSlash, isFunction, isObject, isString } from '../utils'
import { Logger } from '../services'
import { RequestMethod } from '../enums'
import { RoutesResolver } from '../router/routes-resolver'
import { optionalRequire } from '../helpers'
import { GraphInspector } from '../inspector'

const { SocketModule } = optionalRequire(
  '../websockets/socket-module',
  () => require('../websockets/socket-module'),
);

export class Application
  extends ApplicationContext<ApplicationOptionsInterface>
  implements ApplicationInterface
{
  protected readonly logger = new Logger(null, { timestamp: true })
  private readonly middlewareModule = new MiddlewareModule()
  private readonly middlewareContainer = new MiddlewareContainer(this.container)
  private readonly socketModule = SocketModule && new SocketModule();
  private readonly routesResolver: ResolverInterface
  private httpServer: any
  private isListening = false

  constructor (
    container: ContainerIoC,
    private readonly httpAdapter: HttpServer,
    private readonly config: ApplicationConfig,
    private readonly graphInspector: GraphInspector,
    appOptions: ApplicationOptionsInterface = {}
  ) {
    super(container, appOptions)

    this.selectContextModule()
    this.registerHttpServer()
    this.middlewareModule = new MiddlewareModule();
    this.injector = new Injector({ preview: this.appOptions.preview });
    
    this.routesResolver = new RoutesResolver(
      this.container,
      this.config,
      this.injector,
      this.graphInspector,
    )
  }

  protected async dispose (): Promise<void> {
    this.socketModule && (await this.socketModule.close());
    this.httpAdapter && (await this.httpAdapter.close())
  }

  public getHttpAdapter (): AbstractHttpAdapter {
    return this.httpAdapter as AbstractHttpAdapter
  }

  public registerHttpServer () {
    this.httpServer = this.createServer()
  }

  public getUnderlyingHttpServer<T> (): T {
    return this.httpAdapter.getHttpServer()
  }

  public applyOptions () {
    if (!this.appOptions || !this.appOptions.cors) return undefined

    const passCustomOptions =
      isObject(this.appOptions.cors) ||
      typeof this.appOptions.cors === 'function'
    if (!passCustomOptions) return this.enableCors()

    return this.enableCors(
      this.appOptions.cors as CorsOptions | CorsOptionsDelegate<any>
    )
  }

  public createServer<T = any> (): T {
    this.httpAdapter.initHttpServer(this.appOptions)
    return this.httpAdapter.getHttpServer() as T
  }

  public async registerModules () {
    this.registerWsModule();

    await this.middlewareModule.register(
      this.middlewareContainer,
      this.container,
      this.config,
      this.injector,
      this.httpAdapter,
      this.graphInspector,
      this.appOptions,
    )
  }

  public registerWsModule() {
    if (!this.socketModule) {
      return;
    }
    this.socketModule.register(
      this.container,
      this.config,
      this.graphInspector,
      this.appOptions,
      this.httpServer,
    );
  }

  public async init (): Promise<this> {
    this.applyOptions()
    await this.httpAdapter?.init()

    const useBodyParser =
      this.appOptions && this.appOptions.bodyParser !== false
    useBodyParser && this.registerParserMiddleware()

    await this.registerModules()
    await this.registerRouter()
    await this.registerRouterHooks()

    this.isInitialized = true
    this.logger.log(MESSAGES.APPLICATION_READY)
    return this
  }

  public registerParserMiddleware () {
    this.httpAdapter.registerParserMiddleware()
  }

  public async registerRouter () {
    await this.registerMiddleware(this.httpAdapter)

    const prefix = this.config.getGlobalPrefix()
    const basePath = addLeadingSlash(prefix)
    this.routesResolver.resolve(this.httpAdapter, basePath)
  }

  public async registerRouterHooks () {
    this.routesResolver.registerNotFoundHandler()
    this.routesResolver.registerExceptionHandler()
  }

  public getHttpServer () {
    return this.httpServer
  }

  public use (...args: [any, any?]): this {
    this.httpAdapter.use(...args)
    return this
  }

  public enableCors (options?: CorsOptions | CorsOptionsDelegate<any>): void {
    this.httpAdapter.enableCors(options)
  }

  public async listen(port: number | string): Promise<any>

  public async listen(port: number | string, hostname: string): Promise<any>

  public async listen (port: number | string, ...args: any[]): Promise<any> {
    !this.isInitialized && (await this.init())

    return new Promise((resolve, reject) => {
      const errorHandler = (e: any) => {
        this.logger.error(e?.toString?.())
        reject(e)
      }
      this.httpServer.once('error', errorHandler)

      const isCallbackInOriginalArgs = isFunction(args[args.length - 1])
      const listenFnArgs = isCallbackInOriginalArgs
        ? args.slice(0, args.length - 1)
        : args

      this.httpAdapter.listen(
        port,
        ...listenFnArgs,
        (...originalCallbackArgs: unknown[]) => {
          if (originalCallbackArgs[0] instanceof Error) {
            return reject(originalCallbackArgs[0])
          }

          const address = this.httpServer.address()
          if (address) {
            this.httpServer.removeListener('error', errorHandler)
            this.isListening = true
            resolve(this.httpServer)
          }
          if (isCallbackInOriginalArgs) {
            args[args.length - 1](...originalCallbackArgs)
          }
        }
      )
    })
  }

  public async getUrl (): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isListening) {
        this.logger.error(MESSAGES.CALL_LISTEN_FIRST)
        reject(MESSAGES.CALL_LISTEN_FIRST)
      }
      const address = this.httpServer.address()
      resolve(this.formatAddress(address))
    })
  }

  private formatAddress (address: any): string {
    if (typeof address === 'string') {
      if (platform() === 'win32') return address

      const basePath = encodeURIComponent(address)
      return `${this.getProtocol()}+unix://${basePath}`
    }
    let host = this.host()
    if (address && address.family === 'IPv6') {
      if (host === '::') {
        host = '[::1]'
      } else {
        host = `[${host}]`
      }
    } else if (host === '0.0.0.0') {
      host = '127.0.0.1'
    }

    return `${this.getProtocol()}://${host}:${address.port}`
  }

  public setGlobalPrefix (
    prefix: string,
    options?: GlobalPrefixOptionsInterface
  ): this {
    this.config.setGlobalPrefix(prefix);
    if (options) {
      const exclude = options?.exclude
        ? mapToExcludeRoute(options.exclude.filter((item): item is RouteInfo => typeof item !== 'string'))
        : [];
      this.config.setGlobalPrefixOptions({
        ...options,
        exclude,
      });
    }
    return this;
  }

  public useWebSocketAdapter(adapter: WebSocketAdapter): this {
    this.config.setIoAdapter(adapter);
    return this;
  }

  public useGlobalFilters (...filters: ExceptionFilterInterface[]): this {
    this.config.useGlobalFilters(...filters)
    return this
  }

  public useGlobalHandler (...handlers: HandlerTransform<any>[]): this {
    this.config.useGlobalHandlers(...handlers)
    return this
  }

  public useGlobalInterceptors (...interceptors: InterceptorInterface[]): this {
    this.config.useGlobalInterceptors(...interceptors)
    return this
  }

  public useGlobalAccessResources (...guards: AccessResourceInterface[]): this {
    this.config.useGlobalAccessResource(...guards)
    return this
  }

  private host (): string | undefined {
    const address = this.httpServer.address()
    if (typeof address === 'string') return undefined

    return address && address.address
  }

  private getProtocol (): 'http' | 'https' {
    return this.appOptions && this.appOptions.httpsOptions ? 'https' : 'http'
  }

  private async registerMiddleware (instance: any) {
    await this.middlewareModule.registerMiddleware(
      this.middlewareContainer,
      instance
    )
  }
}
