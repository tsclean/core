import { ApplicationConfig } from "../app";
import { GatewayMetadata } from "../contracts/gateway-metadata";
import { ServerAndEventStreamsHost } from "../contracts/server-and-event-streams-host";
import { ServerAndEventStreamsFactory } from "./factories/server-and-event-streams-factory";
import { addLeadingSlash, isString } from "../utils/shared.utils";
import { SocketsContainer } from "./sockets-container";

export class SocketServerProvider {
    constructor(
      private readonly socketsContainer: SocketsContainer,
      private readonly applicationConfig: ApplicationConfig,
    ) {}
  
    public scanForSocketServer<T extends GatewayMetadata = any>(
      options: T,
      port: number,
    ): ServerAndEventStreamsHost {
      const serverAndStreamsHost = this.socketsContainer.getOneByConfig({
        port,
        path: options.path,
      });
      if (serverAndStreamsHost && options.namespace) {
        return this.decorateWithNamespace(
          options,
          port,
          serverAndStreamsHost.server,
        );
      }
      return serverAndStreamsHost
        ? serverAndStreamsHost
        : this.createSocketServer(options, port);
    }
  
    private createSocketServer<T extends GatewayMetadata>(
      options: T,
      port: number,
    ): ServerAndEventStreamsHost {
      const adapter = this.applicationConfig.getIoAdapter();
      const { namespace, server, ...partialOptions } = options as Record<
        string,
        unknown
      >;
      const ioServer = adapter.create(port, partialOptions);
      const serverAndEventStreamsHost =
        ServerAndEventStreamsFactory.create(ioServer);
  
      this.socketsContainer.addOne(
        { port, path: options.path },
        serverAndEventStreamsHost,
      );
      if (!namespace) {
        return serverAndEventStreamsHost;
      }
      return this.decorateWithNamespace(options, port, ioServer);
    }
  
    private decorateWithNamespace<T extends GatewayMetadata = any>(
      options: T,
      port: number,
      targetServer: unknown,
    ): ServerAndEventStreamsHost {
      const namespaceServer = this.getServerOfNamespace(
        options,
        port,
        targetServer,
      );
      const serverAndEventStreamsHost =
        ServerAndEventStreamsFactory.create(namespaceServer);
      this.socketsContainer.addOne(
        { port, path: options.path, namespace: options.namespace },
        serverAndEventStreamsHost,
      );
      return serverAndEventStreamsHost;
    }
  
    private getServerOfNamespace<
      TOptions extends GatewayMetadata = any,
      TServer = any,
    >(options: TOptions, port: number, server: TServer) {
      const adapter = this.applicationConfig.getIoAdapter();
      return adapter.create(port, {
        ...options,
        namespace: this.validateNamespace(options.namespace || ''),
        server,
      });
    }
  
    private validateNamespace(namespace: string | RegExp): string | RegExp {
      if (!isString(namespace)) {
        return namespace;
      }
      return addLeadingSlash(namespace);
    }
  }