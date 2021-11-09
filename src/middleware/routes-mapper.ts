import { ContainerIoC } from '../core/injector';
import { Module } from '../core/injector/module';
import { MetadataScanner } from '../app/metadata-scanner';
import { RouterExplorer } from '../router/router-explorer';
import {RouteInfo, Type} from "../contracts";
import {addLeadingSlash, isString, isUndefined} from "../utils/shared.utils";
import {MODULE_PATH, PATH_METADATA} from "../helpers/constants";

export class RoutesMapper {
  private readonly routerExplorer: RouterExplorer;

  constructor(private readonly container: ContainerIoC) {
    this.routerExplorer = new RouterExplorer(new MetadataScanner(), container);
  }

  public mapRouteToRouteInfo(
    route: Type<any> | RouteInfo | string,
  ): RouteInfo[] {
    if (isString(route)) {
      const defaultRequestMethod = -1;
      return [
        {
          path: addLeadingSlash(route),
          method: defaultRequestMethod,
        },
      ];
    }
    const routePathOrPaths = this.getRoutePath(route);
    if (this.isRouteInfo(routePathOrPaths, route)) {
      return [
        {
          path: addLeadingSlash(route.path),
          method: route.method,
        },
      ];
    }
    const controllerPaths = this.routerExplorer.scanForPaths(
      Object.create(route),
      route.prototype,
    );
    //const moduleRef = this.getHostModuleOfController(route);
   // const modulePath = this.getModulePath(moduleRef?.metaType);

    const concatPaths = <T>(acc: T[], currentValue: T[]) =>
      acc.concat(currentValue);

    return []
      .concat(routePathOrPaths)
      .map(routePath =>
        controllerPaths
          .map(item =>
            item.path?.map(p => {
              //let path = modulePath ?? '';
              let path = ''
              path += this.normalizeGlobalPath(routePath) + addLeadingSlash(p);

              return {
                path,
                method: item.requestMethod,
              };
            }),
          )
          .reduce(concatPaths, []),
      )
      .reduce(concatPaths, []);
  }

  private isRouteInfo(
    path: string | string[] | undefined,
    objectOrClass: Function | RouteInfo,
  ): objectOrClass is RouteInfo {
    return isUndefined(path);
  }

  private normalizeGlobalPath(path: string): string {
    const prefix = addLeadingSlash(path);
    return prefix === '/' ? '' : prefix;
  }

  private getRoutePath(route: Type<any> | RouteInfo): string | undefined {
    return Reflect.getMetadata(PATH_METADATA, route);
  }

  private getHostModuleOfController(
    metatype: Type<unknown>,
  ): Module | undefined {
    if (!metatype) {
      return;
    }
    const modulesContainer = this.container.getModules();
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
    metatype: Type<unknown> | undefined,
  ): string | undefined {
    if (!metatype) {
      return;
    }
    const modulesContainer = this.container.getModules();
    const modulePath = Reflect.getMetadata(
      MODULE_PATH + modulesContainer.applicationId,
      metatype,
    );
    return modulePath ?? Reflect.getMetadata(MODULE_PATH, metatype);
  }
}
