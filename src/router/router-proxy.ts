import { ExecutionContextHost } from '../helpers';
import {ExceptionsHandler} from "../core";

export type RouterProxyCallback = <TRequest, TResponse>(
  req?: TRequest,
  res?: TResponse,
  next?: () => void,
) => void;

export class RouterProxy {
  public createProxy(
    targetCallback: RouterProxyCallback,
    exceptionsHandler: ExceptionsHandler,
  ) {
    return async <TRequest, TResponse>(
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => {
      try {
        await targetCallback(req, res, next);
      } catch (e) {
        const host = new ExecutionContextHost([req, res, next]);
        exceptionsHandler.next(e, host);
      }
    };
  }

  public createExceptionLayerProxy(
    targetCallback: <TError, TRequest, TResponse>(
      err: TError,
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => void,
    exceptionsHandler: ExceptionsHandler,
  ) {
    return async <TError, TRequest, TResponse>(
      err: TError,
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => {
      try {
        await targetCallback(err, req, res, next);
      } catch (e) {
        const host = new ExecutionContextHost([req, res, next]);
        exceptionsHandler.next(e, host);
      }
    };
  }
}
