import {RouteParamTypes} from "../enums";

export interface RouteParamsFactoryInterface {
  exchangeKeyForValue<T extends Record<string, any> = any, R = any, Q = any>(
      key: RouteParamTypes | string, data: any, {req, res, next}: { req: T; res: R; next: Function }): Q;
}
