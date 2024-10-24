import {
  CONTROLLER_MAPPING_MESSAGE,
  HOST_METADATA,
  MODULE_PATH,
} from "../helpers";
import { RoutePathFactory } from "./route-path-factory";
import { RouterExceptionFilters } from "./router-exception-filters";
import { RouterExplorer } from "./router-explorer";
import { RouterProxy } from "./router-proxy";
import { Injector, InstanceWrapper, ContainerIoC } from "../core";
import { ApplicationConfig, MetadataScanner } from "../app";
import {
  HttpServer,
  ResolverInterface,
  RoutePathMetadataInterface,
  Type,
} from "../contracts";
import { ControllerType } from "../types";
import { BadRequestException, NotFoundException } from "../exceptions";
import { GraphInspector } from "../inspector";
import { Logger } from "../services";

export class RoutesResolver implements ResolverInterface {
  private readonly logger = new Logger(RoutesResolver.name, {
    timestamp: true,
  });

  private readonly routerProxy = new RouterProxy();
  private readonly routePathFactory: RoutePathFactory;
  private readonly routerExceptionsFilter: RouterExceptionFilters;
  private readonly routerExplorer: RouterExplorer;

  constructor(
    private readonly container: ContainerIoC,
    private readonly applicationConfig: ApplicationConfig,
    private readonly injector: Injector,
    graphInspector: GraphInspector,
  ) {
    const httpAdapterRef = container.getHttpAdapterRef();
    this.routerExceptionsFilter = new RouterExceptionFilters(
      container,
      applicationConfig,
      httpAdapterRef
    );
    this.routePathFactory = new RoutePathFactory(this.applicationConfig);

    const metadataScanner = new MetadataScanner();
    this.routerExplorer = new RouterExplorer(
      metadataScanner,
      this.container,
      graphInspector,
      this.injector,
      this.routerProxy,
      this.routerExceptionsFilter,
      this.applicationConfig,
      this.routePathFactory,
    );
  }

  public resolve<T extends HttpServer>(
    applicationRef: T,
    globalPrefix: string
  ) {
    const modules = this.container.getModules();
    modules.forEach(({ controllers, metaType }, moduleName) => {
      const modulePath = this.getModulePathMetadata(metaType);
      this.registerRouters(
        controllers,
        moduleName,
        globalPrefix,
        modulePath,
        applicationRef
      );
    });
  }

  public registerRouters(
    routes: Map<string | symbol | Function, InstanceWrapper<ControllerType>>,
    moduleName: string,
    globalPrefix: string,
    modulePath: string,
    applicationRef: HttpServer
  ) {
    routes.forEach((instanceWrapper) => {
      const { metaType } = instanceWrapper;

      const host = RoutesResolver.getHostMetadata(metaType);
      const routerPaths = this.routerExplorer.extractRouterPath(
        metaType as Type<any>
      );

      const controllerName = metaType.name;

      routerPaths.forEach((path) => {
        const pathsToLog = this.routePathFactory.create({
          ctrlPath: path,
          modulePath,
          globalPrefix,
        });

        pathsToLog.forEach((path) => {
          const logMessage = CONTROLLER_MAPPING_MESSAGE(controllerName, path);
        });

        const routePathMetadata: RoutePathMetadataInterface = {
          ctrlPath: path,
          modulePath,
          globalPrefix,
        };
        this.routerExplorer.explore(
          instanceWrapper,
          moduleName,
          applicationRef,
          host,
          routePathMetadata
        );
      });
    });
  }

  public registerNotFoundHandler() {
    const applicationRef = this.container.getHttpAdapterRef();
    const callback = <T, R>(req: T, res: R) => {
      const method = applicationRef.getRequestMethod(req);
      const url = applicationRef.getRequestUrl(req);
      throw new NotFoundException(`Cannot ${method} ${url}`);
    };
    const handler = this.routerExceptionsFilter.create({}, callback, "");
    const proxy = this.routerProxy.createProxy(callback, handler);
    applicationRef.setNotFoundHandler &&
      applicationRef.setNotFoundHandler(
        proxy,
        this.applicationConfig.getGlobalPrefix()
      );
  }

  public registerExceptionHandler() {
    const callback = <E, T, R>(err: E, req: T, res: R, next: Function) => {
      throw this.mapExternalException(err);
    };
    const handler = this.routerExceptionsFilter.create({}, callback as any, "");
    const proxy = this.routerProxy.createExceptionLayerProxy(callback, handler);
    const applicationRef = this.container.getHttpAdapterRef();
    applicationRef.setErrorHandler &&
      applicationRef.setErrorHandler(
        proxy,
        this.applicationConfig.getGlobalPrefix()
      );
  }

  public mapExternalException(err: any) {
    switch (true) {
      case err instanceof SyntaxError:
        return new BadRequestException(err.message);
      default:
        return err;
    }
  }

  private getModulePathMetadata(metaType: Type<unknown>): string | undefined {
    const modulesContainer = this.container.getModules();
    const modulePath = Reflect.getMetadata(
      MODULE_PATH + modulesContainer.applicationId,
      metaType
    );
    return modulePath ?? Reflect.getMetadata(MODULE_PATH, metaType);
  }

  private static getHostMetadata(
    metaType: Type<unknown> | Function
  ): string | string[] | undefined {
    return Reflect.getMetadata(HOST_METADATA, metaType);
  }
}
