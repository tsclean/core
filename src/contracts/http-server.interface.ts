import {RequestMethod} from '../enums';
import {ErrorHandlerType, RequestHandlerType} from "../types";
import {ApplicationOptionsInterface} from './application-options';
import {CorsOptionsDelegate, CorsOptions} from "./cors-options";

export interface HttpServer<T = any, R = any> {
    use(handler: RequestHandlerType<T, R> | ErrorHandlerType<T, R>,): any;

    use(path: string,
        handler: RequestHandlerType<T, R> | ErrorHandlerType<T, R>): any;

    get(handler: RequestHandlerType<T, R>): any;

    get(path: string, handler: RequestHandlerType<T, R>): any;

    post(handler: RequestHandlerType<T, R>): any;

    post(path: string, handler: RequestHandlerType<T, R>): any;

    head(handler: RequestHandlerType<T, R>): any;

    head(path: string, handler: RequestHandlerType<T, R>): any;

    delete(handler: RequestHandlerType<T, R>): any;

    delete(path: string, handler: RequestHandlerType<T, R>): any;

    put(handler: RequestHandlerType<T, R>): any;

    put(path: string, handler: RequestHandlerType<T, R>): any;

    patch(handler: RequestHandlerType<T, R>): any;

    patch(path: string, handler: RequestHandlerType<T, R>): any;

    all(path: string, handler: RequestHandlerType<T, R>): any;

    all(handler: RequestHandlerType<T, R>): any;

    options(handler: RequestHandlerType<T, R>): any;

    options(path: string, handler: RequestHandlerType<T, R>): any;

    listen(port: number | string, callback?: () => void): any;

    listen(port: number | string, hostname: string, callback?: () => void): any;

    reply(response: any, body: any, statusCode?: number): any;

    status(response: any, statusCode: number): any;

    render(response: any, view: string, options: any): any;

    redirect(response: any, statusCode: number, url: string): any;

    setHeader(response: any, name: string, value: string): any;

    setErrorHandler?(handler: Function, prefix?: string): any;

    setNotFoundHandler?(handler: Function, prefix?: string): any;

    useStaticAssets?(...args: any[]): this;

    setBaseViewsDir?(path: string | string[]): this;

    setViewEngine?(engineOrOptions: any): this;

    createMiddlewareFactory(method: RequestMethod): ((path: string, callback: Function) => any)
        | Promise<(path: string, callback: Function) => any>;

    getRequestHostname?(request: T): string;

    getRequestMethod?(request: T): string;

    getRequestUrl?(request: T): string;

    getInstance(): any;

    registerParserMiddleware(): any;

    enableCors(options: CorsOptions | CorsOptionsDelegate<T>): any;

    getHttpServer(): any;

    initHttpServer(options: ApplicationOptionsInterface): void;

    close(): any;

    getType(): string;

    init?(): Promise<void>;
}
