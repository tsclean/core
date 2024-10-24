import { ApplicationConfig } from '../app'
import {
  ApplicationContextOptionsInterface,
  CleanGateway,
  InjectionToken
} from '../contracts'
import { ContainerIoC, InstanceWrapper } from '../core'
import { GATEWAY_METADATA, loadAdapter } from '../helpers'
import iterate from 'iterare'
import { InjectableType } from '../types'
import { AbstractWsAdapter } from './adapters/ws-adapter'
import { WsContextCreator } from './context/ws-context-creator'
import { WsProxy } from './context/ws-proxy'
import { ExceptionFiltersContext } from './context/exception-filters-context'
import { HandlerContextCreator } from './handler/handler-context-creator'
import { HandlerConsumer } from './handler/handler-consumer'
import { AccessResourceConsumer, AccessResourceContextCreator } from '../access'
import { InterceptorsConsumer, InterceptorsContextCreator } from '../interceptors'
import { SocketsContainer } from './sockets-container'
import { GraphInspector } from '../inspector/graph-inspector'
import { WebSocketsController } from './web-sockets-controller'
import { SocketServerProvider } from './socket-server-provider'

export class SocketModule<
  THttpServer = any,
  TAppOptions extends ApplicationContextOptionsInterface = ApplicationContextOptionsInterface
> {
  private readonly socketsContainer = new SocketsContainer()
  private applicationConfig: ApplicationConfig
  private webSocketsController: WebSocketsController
  private isAdapterInitialized: boolean
  private httpServer: THttpServer | undefined
  private appOptions: TAppOptions

  public register (
    container: ContainerIoC,
    applicationConfig: ApplicationConfig,
    graphInspector: GraphInspector,
    appOptions: TAppOptions,
    httpServer?: THttpServer
  ) {
    this.applicationConfig = applicationConfig
    this.appOptions = appOptions
    this.httpServer = httpServer

    const contextCreator = this.getContextCreator(container)
    const serverProvider = new SocketServerProvider(
      this.socketsContainer,
      applicationConfig
    )
    this.webSocketsController = new WebSocketsController(
      serverProvider,
      applicationConfig,
      contextCreator,
      graphInspector,
      this.appOptions
    )
    const modules = container.getModules()
    modules.forEach(({ providers }, moduleName: string) =>
      this.connectAllGateways(providers, moduleName)
    )
  }

  public connectAllGateways (
    providers: Map<InjectionToken, InstanceWrapper<InjectableType>>,
    moduleName: string
  ) {
    iterate(providers.values())
      .filter(wrapper => wrapper && !wrapper.isNotMetatype)
      .forEach(wrapper => this.connectGatewayToServer(wrapper, moduleName))
  }

  public connectGatewayToServer (
    wrapper: InstanceWrapper<InjectableType>,
    moduleName: string
  ) {
    const { instance, metaType } = wrapper
    const metadataKeys = Reflect.getMetadataKeys(metaType)
    if (!metadataKeys.includes(GATEWAY_METADATA)) {
      return
    }
    if (!this.isAdapterInitialized) {
      this.initializeAdapter()
    }
    this.webSocketsController.connectGatewayToServer(
      instance as CleanGateway,
      metaType,
      moduleName,
      wrapper.id
    )
  }

  public async close (): Promise<any> {
    if (!this.applicationConfig) {
      return
    }
    const adapter = this.applicationConfig.getIoAdapter()
    if (!adapter) {
      return
    }
    const servers = this.socketsContainer.getAll()
    await Promise.all(
      iterate(servers.values())
        .filter(({ server }) => server)
        .map(async ({ server }) => adapter.close(server))
    )
    await (adapter as AbstractWsAdapter)?.dispose()

    this.socketsContainer.clear()
  }

  private initializeAdapter () {
    const adapter = this.applicationConfig.getIoAdapter()
    if (adapter) {
      this.isAdapterInitialized = true
      return
    }
    const { IoAdapter } = loadAdapter(
      'socket.io',
      'WebSockets',
      () => require('../server/io-adapter')
    )
    const ioAdapter = new IoAdapter(this.httpServer)
    this.applicationConfig.setIoAdapter(ioAdapter)

    this.isAdapterInitialized = true
  }

  private getContextCreator (container: ContainerIoC): WsContextCreator {
    return new WsContextCreator(
      new WsProxy(),
      new ExceptionFiltersContext(container),
      new HandlerContextCreator(container),
      new HandlerConsumer(),
      new AccessResourceContextCreator(container),
      new AccessResourceConsumer(),
      new InterceptorsContextCreator(container),
      new InterceptorsConsumer()
    )
  }
}
