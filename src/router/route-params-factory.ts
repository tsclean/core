import {RouteParamTypes} from "../enums";
import {RouteParamsFactoryInterface} from "../contracts";

export class RouteParamsFactory implements RouteParamsFactoryInterface {
  public exchangeKeyForValue<T extends Record<string, any> = any, R = any, Q = any>(
    key: RouteParamTypes | string, data: string | object | any, { req, res, next }: { req: T; res: R; next: Function }): Q {
    switch (key) {
      case RouteParamTypes.NEXT:
        return next as any;
      case RouteParamTypes.REQUEST:
        return req as any;
      case RouteParamTypes.RESPONSE:
        return res as any;
      case RouteParamTypes.BODY:
        return data && req.body ? req.body[data] : req.body;
      case RouteParamTypes.PARAM:
        return data ? req.params[data] : req.params;
      case RouteParamTypes.HOST:
        const hosts = req.hosts || {};
        return data ? hosts[data] : hosts;
      case RouteParamTypes.QUERY:
        return data ? req.query[data] : req.query;
      case RouteParamTypes.HEADERS:
        return data ? req.headers[data.toLowerCase()] : req.headers;
      default:
        return null;
    }
  }
}
