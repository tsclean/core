import {Observable} from "rxjs";
import {ExecutionContextInterface} from './execution-context';

export interface CallHandlerInterface<T = any> {
    handle(): Promise<T> | Observable<T>;
}

export const MULTER_MODULE_OPTIONS = 'MULTER_MODULE_OPTIONS';
export interface InterceptorInterface<T = any, R = any> {
    intercept(
        context: ExecutionContextInterface,
        next: CallHandlerInterface<T>
    ): Promise<R> | Promise<Promise<R>> | Observable<R> | Promise<Observable<R>>;
}
