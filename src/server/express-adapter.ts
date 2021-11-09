import cors from 'cors';
import express from 'express';
import * as http from 'http';
import * as https from 'https';
import * as bodyParser from 'body-parser';

import {AbstractHttpAdapter} from "../core";
import {RouterMethodFactory} from "../helpers";
import {isFunction, isNil, isObject} from "../utils";

import {
    CorsOptions,
    CorsOptionsDelegate,
    ApplicationOptionsInterface
} from "../contracts";
import {RequestMethod} from "../enums";

export class ExpressAdapter extends AbstractHttpAdapter {
    private readonly routerMethodFactory = new RouterMethodFactory();

    constructor(instance?: any) {
        super(instance || express());
    }

    public reply(response: any, body: any, statusCode?: number) {
        if (statusCode) response.status(statusCode);
        if (isNil(body)) return response.send();

        return isObject(body) ? response.json(body) : response.send(String(body));
    }

    public status(response: any, statusCode: number) {
        return response.status(statusCode);
    }

    public render(response: any, view: string, options: any) {
        return response.render(view, options);
    }

    public redirect(response: any, statusCode: number, url: string) {
        return response.redirect(statusCode, url);
    }

    public setErrorHandler(handler: Function, prefix?: string) {
        return this.use(handler);
    }

    public setNotFoundHandler(handler: Function, prefix?: string) {
        return this.use(handler);
    }

    public setHeader(response: any, name: string, value: string) {
        return response.set(name, value);
    }

    public listen(port: string | number, callback?: () => void): any;
    public listen(port: string | number, hostname: string, callback?: () => void): any;
    public listen(port: any, ...args: any[]) {
        return this.httpServer.listen(port, ...args);
    }

    public close() {
        if (!this.httpServer) {
            return undefined;
        }
        return new Promise(resolve => this.httpServer.close(resolve));
    }

    public set(...args: any[]) {
        return this.instance.set(...args);
    }

    public enable(...args: any[]) {
        return this.instance.enable(...args);
    }

    public disable(...args: any[]) {
        return this.instance.disable(...args);
    }

    public getRequestHostname(request: any): string {
        return request.hostname;
    }

    public getRequestMethod(request: any): string {
        return request.method;
    }

    public getRequestUrl(request: any): string {
        return request.originalUrl;
    }

    public enableCors(options: CorsOptions | CorsOptionsDelegate<any>) {
        return this.use(cors(options));
    }

    public createMiddlewareFactory(requestMethod: RequestMethod): (path: string, callback: Function) => any {
        return this.routerMethodFactory
            .get(this.instance, requestMethod)
            .bind(this.instance);
    }

    public initHttpServer(options: ApplicationOptionsInterface) {
        const isHttpsEnabled = options && options.httpsOptions;
        if (isHttpsEnabled) {
            this.httpServer = https.createServer(
                options.httpsOptions,
                this.getInstance(),
            );
            return;
        }
        this.httpServer = http.createServer(this.getInstance());
    }

    public registerParserMiddleware() {
        const parserMiddleware = {
            jsonParser: bodyParser.json(),
            urlencodedParser: bodyParser.urlencoded({extended: true}),
        };
        Object.keys(parserMiddleware)
            .filter(parser => !this.isMiddlewareApplied(parser))
            .forEach(parserKey => this.use(parserMiddleware[parserKey]));
    }

    public getType(): string {
        return 'express';
    }

    private isMiddlewareApplied(name: string): boolean {
        const app = this.getInstance();
        return (
            !!app._router &&
            !!app._router.stack &&
            isFunction(app._router.stack.filter) &&
            app._router.stack.some(
                (layer: any) => layer && layer.handle && layer.handle.name === name,
            )
        );
    }
}
