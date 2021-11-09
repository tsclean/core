import {iterate} from 'iterare';
import pathToRegexp from 'path-to-regexp';
import {v4 as uuid} from 'uuid';

import {isRouteExcluded} from '../router/utils';
import {ExcludeRouteMetadataInterface, HttpServer, RouteInfo, Type} from "../contracts";
import {isFunction} from "../utils/shared.utils";
import {RequestMethod} from "../enums";

export const mapToExcludeRoute = (routes: RouteInfo[]): ExcludeRouteMetadataInterface[] => {
    return routes.map(({path, method}) => ({
        pathRegex: pathToRegexp(path),
        requestMethod: method,
    }));
};

export const filterMiddleware = <T extends Function | Type<any> = any>(
    middleware: T[], routes: RouteInfo[], httpAdapter: HttpServer) => {
    const excludedRoutes = mapToExcludeRoute(routes);
    return iterate([])
        .concat(middleware)
        .filter(isFunction)
        .map((item: T) => mapToClass(item, excludedRoutes, httpAdapter))
        .toArray();
};

export const mapToClass = <T extends Function | Type<any>>(
    middleware: T, excludedRoutes: ExcludeRouteMetadataInterface[], httpAdapter: HttpServer) => {
    if (isMiddlewareClass(middleware)) {
        if (excludedRoutes.length <= 0) return middleware;

        const MiddlewareHost = class extends (middleware as Type<any>) {
            use(...params: unknown[]) {
                const [req, _, next] = params as [Record<string, any>, any, Function];
                const isExcluded = isMiddlewareRouteExcluded(
                    req,
                    excludedRoutes,
                    httpAdapter,
                );
                if (isExcluded) {
                    return next();
                }
                return super.use(...params);
            }
        };
        return assignToken(MiddlewareHost, middleware.name);
    }
    return assignToken(
        class {
            use = (...params: unknown[]) => {
                const [req, _, next] = params as [Record<string, any>, any, Function];
                const isExcluded = isMiddlewareRouteExcluded(
                    req,
                    excludedRoutes,
                    httpAdapter,
                );
                if (isExcluded) {
                    return next();
                }
                return (middleware as Function)(...params);
            };
        },
    );
};

export function isMiddlewareClass(middleware: any): middleware is Type<any> {
    const middlewareStr = middleware.toString();
    if (middlewareStr.substring(0, 5) === 'class') return true;

    const middlewareArr = middlewareStr.split(' ');
    return (
        middlewareArr[0] === 'function' &&
        /[A-Z]/.test(middlewareArr[1]?.[0]) &&
        typeof middleware.prototype?.use === 'function'
    );
}

export function assignToken(metaType: Type<any>, token = uuid()): Type<any> {
    Object.defineProperty(metaType, 'name', {value: token});
    return metaType;
}

export function isMiddlewareRouteExcluded(
    req: Record<string, any>, excludedRoutes: ExcludeRouteMetadataInterface[], httpAdapter: HttpServer): boolean {

    if (excludedRoutes.length <= 0) return false;

    const reqMethod = httpAdapter.getRequestMethod(req);
    const originalUrl = httpAdapter.getRequestUrl(req);
    const queryParamsIndex = originalUrl && originalUrl.indexOf('?');
    const pathname = queryParamsIndex >= 0 ? originalUrl.slice(0, queryParamsIndex) : originalUrl;

    return isRouteExcluded(excludedRoutes, pathname, RequestMethod[reqMethod]);
}
