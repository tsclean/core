import { Observable } from 'rxjs'
import { Application } from '../../app'
import {
  ApplicationContextInterface,
  WebSocketAdapter,
  WsMessageHandler
} from '../../contracts'
import { CONNECTION_EVENT, DISCONNECT_EVENT } from '../../helpers'
import { isFunction } from '../../utils/shared.utils'

export interface BaseWsInstance {
  on: (event: string, callback: Function) => void
  close: Function
}

export abstract class AbstractWsAdapter<
  TServer extends BaseWsInstance = any,
  TClient extends BaseWsInstance = any,
  TOptions = any
> implements WebSocketAdapter<TServer, TClient, TOptions>
{
  protected readonly httpServer: any

  constructor (appOrHttpServer?: ApplicationContextInterface | any) {
    if (appOrHttpServer && appOrHttpServer instanceof Application) {
      this.httpServer = appOrHttpServer.getUnderlyingHttpServer()
    } else {
      this.httpServer = appOrHttpServer
    }
  }

  public bindClientConnect (server: TServer, callback: Function) {
    server.on(CONNECTION_EVENT, callback)
  }

  public bindClientDisconnect (client: TClient, callback: Function) {
    client.on(DISCONNECT_EVENT, callback)
  }

  public async close (server: TServer) {
    const isCallable = server && isFunction(server.close)
    isCallable && (await new Promise(resolve => server.close(resolve)))
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async dispose () {}

  public abstract create(port: number, options?: TOptions): TServer
  public abstract bindMessageHandlers(
    client: TClient,
    handlers: WsMessageHandler[],
    transform: (data: any) => Observable<any>
  )
}
