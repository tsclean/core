import { ContainerIoC } from '../core/injector'
import { Module } from '../core/injector/module'
import { MetadataScanner } from '../app/metadata-scanner'
import { RouteInfo, Type } from '../contracts'
import { addLeadingSlash, isString, isUndefined } from '../utils/shared.utils'
import { MODULE_PATH, PATH_METADATA } from '../helpers/constants'
import { ApplicationConfig } from '../app'
import { PathsExplorer, RouteDefinition } from '../router/paths-explorer'

export class RoutesMapper {
  private readonly pathsExplorer: PathsExplorer;

  constructor(
    private readonly container: ContainerIoC,
    private readonly applicationConfig: ApplicationConfig
  ) {
    this.pathsExplorer = new PathsExplorer(new MetadataScanner());
  }

  public mapRouteToRouteInfo(
    controllerOrRoute: Type<any> | RouteInfo | string,
  ): RouteInfo[] {
   
    if (isString(controllerOrRoute)) {
      return this.getRouteInfoFromPath(controllerOrRoute);
    }
    const routePathOrPaths = this.getRoutePath(controllerOrRoute);
    if (this.isRouteInfo(routePathOrPaths, controllerOrRoute)) {
      return this.getRouteInfoFromObject(controllerOrRoute);
    }

    return this.getRouteInfoFromController(controllerOrRoute, routePathOrPaths);
  }

  private getRouteInfoFromPath(routePath: string): RouteInfo[] {
    const defaultRequestMethod = -1;
    return [
      {
        path: addLeadingSlash(routePath),
        method: defaultRequestMethod as any,
      },
    ];
  }

  private getRouteInfoFromObject(routeInfoObject: RouteInfo): RouteInfo[] {
    const routeInfo: RouteInfo = {
      path: addLeadingSlash(routeInfoObject.path),
      method: routeInfoObject.method,
    };

    return [routeInfo];
  }

  private getRouteInfoFromController(
    controller: Type<any>,
    routePath: string,
  ): RouteInfo[] {
    const controllerPaths = this.pathsExplorer.scanForPaths(
      Object.create(controller),
      controller.prototype,
    );
   
    const moduleRef = this.getHostModuleOfController(controller);
    const modulePath = this.getModulePath(moduleRef?.metaType);

    const concatPaths = <T>(acc: T[], currentValue: T[]) =>
      acc.concat(currentValue);

    const toRouteInfo = (item: RouteDefinition, prefix: string) =>
      item.path?.flatMap(p => {
        let endpointPath = modulePath ?? '';
        endpointPath += this.normalizeGlobalPath(prefix) + addLeadingSlash(p);

        const routeInfo: RouteInfo = {
          path: endpointPath,
          method: item.requestMethod,
        };
        return routeInfo;
      });

    return []
      .concat(routePath)
      .map(routePath =>
        controllerPaths
          .map(item => toRouteInfo(item, routePath))
          .reduce(concatPaths, []),
      )
      .reduce(concatPaths, []);
  }

  private isRouteInfo(
    path: string | string[] | undefined,
    objectOrClass: Function | RouteInfo
  ): objectOrClass is RouteInfo {
    return isUndefined(path)
  }

  private normalizeGlobalPath(path: string): string {
    const prefix = addLeadingSlash(path)
    return prefix === '/' ? '' : prefix
  }

  private getRoutePath(route: Type<any> | RouteInfo): string | undefined {
    return Reflect.getMetadata(PATH_METADATA, route)
  }

  private getHostModuleOfController(
    metatype: Type<unknown>
  ): Module | undefined {
    if (!metatype) {
      return
    }
    const modulesContainer = this.container.getModules()
    // const moduleRefsSet = targetModulesByContainer.get(modulesContainer);
    // if (!moduleRefsSet) {
    //   return;
    // }

    // const modules = Array.from(modulesContainer.values()).filter(moduleRef =>
    //   moduleRefsSet.has(moduleRef),
    // );
    //return modules.find(({ routes }) => routes.has(metatype));
  }

  private getModulePath(
    metatype: Type<unknown> | undefined
  ): string | undefined {
    if (!metatype) {
      return
    }
    const modulesContainer = this.container.getModules()
    const modulePath = Reflect.getMetadata(
      MODULE_PATH + modulesContainer.applicationId,
      metatype
    )
    return modulePath ?? Reflect.getMetadata(MODULE_PATH, metatype)
  }
}
