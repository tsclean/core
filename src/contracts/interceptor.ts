import {ExecutionContextInterface} from './execution-context';

export interface CallHandlerInterface<T = any> {
    handle(): Promise<T>;
}

export interface InterceptorInterface<T = any, R = any> {
    intercept(context: ExecutionContextInterface, next: CallHandlerInterface<T>): Promise<R> | Promise<Promise<R>>;
}
