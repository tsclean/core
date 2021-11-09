import {RequestMethod} from '../enums';
import {Type} from './type';

export interface RouteInfo {
    path: string;
    method: RequestMethod;
}

export interface MiddlewareConfigurationInterface<T = any> {
    middleware: T;
    forRoutes: (Type<any> | string | RouteInfo)[];
}
