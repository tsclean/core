import { Type } from './type';
import { RouteInfo } from './middleware-configuration';
import { MiddlewareConsumerInterface } from './middleware-consumer';

export interface MiddlewareConfigProxyInterface {

  exclude(...routes: (string | RouteInfo)[]): MiddlewareConfigProxyInterface;

  forRoutes(...routes: (string | Type<any> | RouteInfo)[]): MiddlewareConsumerInterface;
}
