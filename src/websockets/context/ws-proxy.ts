import { ExecutionContextHost } from "../../helpers";
import { catchError, EMPTY, isObservable } from "rxjs";
import { WsExceptionsHandler } from "../../websockets";

export class WsProxy {
    public create(
      targetCallback: (...args: unknown[]) => Promise<any>,
      exceptionsHandler: WsExceptionsHandler,
      targetPattern?: string,
    ): (...args: unknown[]) => Promise<any> {
      return async (...args: unknown[]) => {
        args = [...args, targetPattern ?? 'unknown'];
        try {
          const result = await targetCallback(...args);
          return !isObservable(result)
            ? result
            : result.pipe(
                catchError(error => {
                  this.handleError(exceptionsHandler, args, error);
                  return EMPTY;
                }),
              );
        } catch (error) {
          this.handleError(exceptionsHandler, args, error);
        }
      };
    }
  
    handleError<T>(
      exceptionsHandler: WsExceptionsHandler,
      args: unknown[],
      error: T,
    ) {
      const host = new ExecutionContextHost(args);
      host.setType('ws');
      exceptionsHandler.handle(error, host);
    }
  }