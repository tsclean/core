import { DISCONNECT_EVENT } from "../helpers";
import { filter, first, fromEvent, map, mergeMap, Observable, share, takeUntil } from "rxjs";
import { Server, ServerOptions, Socket } from "socket.io";
import { isFunction, isNil } from "../utils/shared.utils";
import { AbstractWsAdapter, MessageMappingProperties } from "../websockets";

export class IoAdapter extends AbstractWsAdapter {
    public create(
      port: number,
      options?: ServerOptions & { namespace?: string; server?: any },
    ): Server {
      if (!options) {
        return this.createIOServer(port);
      }
      const { namespace, server, ...opt } = options;
      return server && isFunction(server.of)
        ? server.of(namespace)
        : namespace
          ? this.createIOServer(port, opt).of(namespace)
          : this.createIOServer(port, opt);
    }
  
    public createIOServer(port: number, options?: any): any {
      if (this.httpServer && port === 0) {
        return new Server(this.httpServer, options);
      }
      return new Server(port, options);
    }
  
    public bindMessageHandlers(
      socket: Socket,
      handlers: MessageMappingProperties[],
      transform: (data: any) => Observable<any>,
    ) {
      const disconnect$ = fromEvent(socket, DISCONNECT_EVENT).pipe(
        share(),
        first(),
      );
  
      handlers.forEach(({ message, callback }) => {
        const source$ = fromEvent(socket, message).pipe(
          mergeMap((payload: any) => {
            const { data, ack } = this.mapPayload(payload);
            return transform(callback(data, ack)).pipe(
              filter((response: any) => !isNil(response)),
              map((response: any) => [response, ack]),
            );
          }),
          takeUntil(disconnect$),
        );
        source$.subscribe(([response, ack]) => {
          if (response.event) {
            return socket.emit(response.event, response.data);
          }
          isFunction(ack) && ack(response);
        });
      });
    }
  
    public mapPayload(payload: unknown): { data: any; ack?: Function } {
      if (!Array.isArray(payload)) {
        if (isFunction(payload)) {
          return { data: undefined, ack: payload as Function };
        }
        return { data: payload };
      }
      const lastElement = payload[payload.length - 1];
      const isAck = isFunction(lastElement);
      if (isAck) {
        const size = payload.length - 1;
        return {
          data: size === 1 ? payload[0] : payload.slice(0, size),
          ack: lastElement,
        };
      }
      return { data: payload };
    }
  }
  