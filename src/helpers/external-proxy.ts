import { ExternalExceptionsHandler } from '../core/exceptions/external-exceptions-handler';
import { ExecutionContextHost } from './execution-context-host';
import {ContextType} from "../types";

export class ExternalErrorProxy {
  public createProxy<T extends string = ContextType>(
    targetCallback: (...args: any[]) => any, exceptionsHandler: ExternalExceptionsHandler, type?: T) {
    return async (...args: any[]) => {
      try {
        return await targetCallback(...args);
      } catch (e) {
        const host = new ExecutionContextHost(args);
        host.setType<T>(type);
        return exceptionsHandler.next(e, host);
      }
    };
  }
}
