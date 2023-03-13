import {Observable} from "rxjs";
import {ExecutionContextInterface} from './execution-context';

export interface CallHandlerInterface<T = any> {
    handle(): Observable<T>;
}

export interface InterceptorInterface<T = any, R = any> {
    intercept(
        context: ExecutionContextInterface,
        next: CallHandlerInterface<T>
    ): Observable<R> | Promise<Observable<R>>;
}
