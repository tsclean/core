import { ServerAndEventStreamsHost } from '../../contracts/server-and-event-streams-host'
import { ReplaySubject, Subject } from 'rxjs'

export class ServerAndEventStreamsFactory {
  public static create<T = any> (server: T): ServerAndEventStreamsHost<T> {
    const init = new ReplaySubject<T>()
    init.next(server)

    const connection = new Subject()
    const disconnect = new Subject()
    return {
      init,
      connection,
      disconnect,
      server
    }
  }
}
