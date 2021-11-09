import {
    CorsOptions,
    CorsOptionsDelegate,
    HttpServer,
    ApplicationOptionsInterface
} from "../../contracts";
import {RequestMethod} from "../../enums";
import {RequestHandlerType} from "../../types";

export abstract class AbstractHttpAdapter<S = any, T = any, R = any> implements HttpServer<T, R> {
    protected httpServer: S;

    protected constructor(
        protected instance?: any
    ) {
    }

    public async init() {
    }

    public use(...args: any[]) {
        return this.instance.use(...args);
    }

    public get(handler: RequestHandlerType);
    public get(path: any, handler: RequestHandlerType);
    public get(...args: any[]) {
        return this.instance.get(...args);
    }

    public post(handler: RequestHandlerType);
    public post(path: any, handler: RequestHandlerType);
    public post(...args: any[]) {
        return this.instance.post(...args);
    }

    public head(handler: RequestHandlerType);
    public head(path: any, handler: RequestHandlerType);
    public head(...args: any[]) {
        return this.instance.head(...args);
    }

    public delete(handler: RequestHandlerType);
    public delete(path: any, handler: RequestHandlerType);
    public delete(...args: any[]) {
        return this.instance.delete(...args);
    }

    public put(handler: RequestHandlerType);
    public put(path: any, handler: RequestHandlerType);
    public put(...args: any[]) {
        return this.instance.put(...args);
    }

    public patch(handler: RequestHandlerType);
    public patch(path: any, handler: RequestHandlerType);
    public patch(...args: any[]) {
        return this.instance.patch(...args);
    }

    public all(handler: RequestHandlerType);
    public all(path: any, handler: RequestHandlerType);
    public all(...args: any[]) {
        return this.instance.all(...args);
    }

    public options(handler: RequestHandlerType);
    public options(path: any, handler: RequestHandlerType);
    public options(...args: any[]) {
        return this.instance.options(...args);
    }

    public listen(port: string | number, callback?: () => void);
    public listen(port: string | number, hostname: string, callback?: () => void);
    public listen(port: any, hostname?: any, callback?: any) {
        return this.instance.listen(port, hostname, callback);
    }

    public getHttpServer(): S {
        return this.httpServer as S;
    }

    public getInstance<T = any>(): T {
        return this.instance as T;
    }

    abstract close();

    abstract initHttpServer(options: ApplicationOptionsInterface);

    abstract getRequestHostname(request);

    abstract getRequestMethod(request);

    abstract getRequestUrl(request);

    abstract status(response, statusCode: number);

    abstract reply(response, body: any, statusCode?: number);

    abstract render(response, view: string, options: any);

    abstract redirect(response, statusCode: number, url: string);

    abstract setErrorHandler(handler: Function, prefix?: string);

    abstract setNotFoundHandler(handler: Function, prefix?: string);

    abstract setHeader(response, name: string, value: string);

    abstract registerParserMiddleware(prefix?: string);

    abstract enableCors(
        options: CorsOptions | CorsOptionsDelegate<T>, prefix?: string);

    abstract createMiddlewareFactory(requestMethod: RequestMethod): ((path: string, callback: Function) => any)
        | Promise<(path: string, callback: Function) => any>;

    abstract getType(): string;
}
