import { Type } from './type';
import { MiddlewareConfigProxyInterface } from './middleware-config-proxy';

export interface MiddlewareConsumerInterface {
  apply(...middleware: (Type<any> | Function)[]): MiddlewareConfigProxyInterface;
}
