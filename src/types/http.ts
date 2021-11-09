export type ErrorHandlerType<T = any, R = any> = (
    error: any, req: T, res: R, next?: Function) => any;

export type RequestHandlerType<T = any, R = any> = (req: T, res: R, next?: Function) => any;