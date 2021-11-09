import { ContextId } from '../core/injector';
import { REQUEST_CONTEXT_ID } from '../router/request/request-constants';

export function createContextId(): ContextId {
  return { id: Math.random() };
}

export class ContextIdFactory {

  public static create(): ContextId {
    return createContextId();
  }

  public static getByRequest<T extends Record<any, any> = any>(request: T): ContextId {
    if (!request) return createContextId();
    if (request[REQUEST_CONTEXT_ID as any]) return request[REQUEST_CONTEXT_ID as any];
    if (request.raw && request.raw[REQUEST_CONTEXT_ID]) return request.raw[REQUEST_CONTEXT_ID];

    return createContextId();
  }
}
