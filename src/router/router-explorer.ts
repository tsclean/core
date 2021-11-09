import pathToRegexp from 'path-to-regexp';
import {UnknownRequestMappingException} from '../errors';
import {
    ROUTE_MAPPED_MESSAGE,
    ContextIdFactory,
    ExecutionContextHost,
    RouterMethodFactory,
    PATH_METADATA,
    METHOD_METADATA
} from '../helpers';
import {InterceptorsConsumer, InterceptorsContextCreator} from '../interceptors';
import {REQUEST_CONTEXT_ID} from './request/request-constants';
import {RouteParamsFactory} from './route-params-factory';
import {RoutePathFactory} from './route-path-factory';
import {RouterExecutionContext} from './router-execution-context';
import {RouterProxy, RouterProxyCallback} from './router-proxy';
import {RequestMethod} from "../enums";
import {
    ExceptionsFilterInterface,
    HttpServer,
    RouteDefinitionInterface,
    RoutePathMetadataInterface,
    Type
} from "../contracts";
import {Logger} from "../services";
import {ApplicationConfig, MetadataScanner} from "../app";
import {
    ContextId,
    Injector,
    InstanceWrapper,
    Module,
    ContainerIoC,
    HandlersConsumer,
    HandlersContextCreator,
    STATIC_CONTEXT
} from "../core";
import {AccessResourceConsumer, AccessResourceContextCreator} from "../access";
import {ControllerType} from "../types";
import {addLeadingSlash, isString, isUndefined} from "../utils";
import {InternalServerErrorException} from "../exceptions";

export class RouterExplorer {
    private readonly executionContextCreator: RouterExecutionContext;
    private readonly routerMethodFactory = new RouterMethodFactory();
    private readonly logger = new Logger(null, true);
    private readonly exceptionFiltersCache = new WeakMap();

    constructor(
        private readonly metadataScanner: MetadataScanner,
        private readonly container: ContainerIoC,
        private readonly injector?: Injector,
        private readonly routerProxy?: RouterProxy,
        private readonly exceptionsFilter?: ExceptionsFilterInterface,
        private readonly config?: ApplicationConfig,
        private readonly routePathFactory?: RoutePathFactory,
    ) {
        this.executionContextCreator = new RouterExecutionContext(
            new RouteParamsFactory(),
            new HandlersContextCreator(container, config),
            new HandlersConsumer(),
            new AccessResourceContextCreator(container, config),
            new AccessResourceConsumer(),
            new InterceptorsContextCreator(container, config),
            new InterceptorsConsumer(),
            container.getHttpAdapterRef(),
        );
    }

    public explore<T extends HttpServer = any>(instanceWrapper: InstanceWrapper,
                                               moduleKey: string,
                                               applicationRef: T,
                                               host: string | RegExp | Array<string | RegExp> | undefined,
                                               routePathMetadata: RoutePathMetadataInterface) {
        const {instance} = instanceWrapper;
        const routerPaths = this.scanForPaths(instance);
        this.applyPathsToRouterProxy(
            applicationRef, routerPaths, instanceWrapper, moduleKey, routePathMetadata, host
        );
    }

    public extractRouterPath(metaType: Type<ControllerType>): string[] {
        const path = Reflect.getMetadata(PATH_METADATA, metaType);
        if (isUndefined(path)) throw new UnknownRequestMappingException();
        if (Array.isArray(path)) return path.map(p => addLeadingSlash(p));

        return [addLeadingSlash(path)];
    }

    public scanForPaths(instance: ControllerType, prototype?: object): RouteDefinitionInterface[] {
        const instancePrototype = isUndefined(prototype) ? Object.getPrototypeOf(instance) : prototype;

        return this.metadataScanner.scanFromPrototype<ControllerType, RouteDefinitionInterface>(
            instance, instancePrototype, method => this.exploreMethodMetadata(instance, instancePrototype, method)
        );
    }

    public exploreMethodMetadata(instance: ControllerType, prototype: object, methodName: string): RouteDefinitionInterface {
        const instanceCallback = instance[methodName];
        const prototypeCallback = prototype[methodName];
        const routePath = Reflect.getMetadata(PATH_METADATA, prototypeCallback);
        if (isUndefined(routePath)) return undefined;

        const requestMethod: RequestMethod = Reflect.getMetadata(METHOD_METADATA, prototypeCallback);
        const path = isString(routePath) ? [addLeadingSlash(routePath)] : routePath.map((p: string) => addLeadingSlash(p));

        return {
            path,
            requestMethod,
            targetCallback: instanceCallback,
            methodName
        };
    }

    public applyPathsToRouterProxy<T extends HttpServer>(router: T,
                                                         routeDefinitions: RouteDefinitionInterface[],
                                                         instanceWrapper: InstanceWrapper,
                                                         moduleKey: string,
                                                         routePathMetadata: RoutePathMetadataInterface,
                                                         host: string | RegExp | Array<string | RegExp> | undefined) {

        (routeDefinitions || []).forEach(routeDefinition => {
            const {version: methodVersion} = routeDefinition;
            routePathMetadata.methodVersion = methodVersion;

            this.applyCallbackToRouter(
                router, routeDefinition, instanceWrapper, moduleKey, routePathMetadata, host
            );
        });
    }

    private applyCallbackToRouter<T extends HttpServer>(router: T,
                                                        routeDefinition: RouteDefinitionInterface,
                                                        instanceWrapper: InstanceWrapper,
                                                        moduleKey: string,
                                                        routePathMetadata: RoutePathMetadataInterface,
                                                        host: string | RegExp | Array<string | RegExp> | undefined) {

        const {path: paths, requestMethod, targetCallback, methodName} = routeDefinition;

        const {instance} = instanceWrapper;
        const routerMethodRef = this.routerMethodFactory
            .get(router, requestMethod)
            .bind(router);

        const isRequestScoped = !instanceWrapper.isDependencyTreeStatic();
        const proxy = isRequestScoped
            ? this.createRequestScopedHandler(
                instanceWrapper, requestMethod, this.container.getModuleByKey(moduleKey), moduleKey, methodName
            )
            : this.createCallbackProxy(
                instance, targetCallback, methodName, moduleKey, requestMethod
            );

        let routeHandler = this.applyHostFilter(host, proxy);

        paths.forEach(path => {
            routePathMetadata.methodPath = path;
            const pathsToRegister = this.routePathFactory.create(routePathMetadata, requestMethod);
            pathsToRegister.forEach(path => routerMethodRef(path, routeHandler));

            const pathsToLog = this.routePathFactory.create(
                {
                    ...routePathMetadata,
                    versioningOptions: undefined,
                },
                requestMethod,
            );
            pathsToLog.forEach(path => this.logger.log(ROUTE_MAPPED_MESSAGE(path, requestMethod)));
        });
    }

    private applyHostFilter(host: string | RegExp | Array<string | RegExp> | undefined, handler: Function) {
        if (!host) return handler;

        const httpAdapterRef = this.container.getHttpAdapterRef();
        const hosts = Array.isArray(host) ? host : [host];
        const hostRegExps = hosts.map((host: string | RegExp) => {
            const keys: any = [];
            const regexp = pathToRegexp(host, keys);
            return {regexp, keys};
        });

        const unsupportedFilteringErrorMessage = Array.isArray(host)
            ? `HTTP adapter does not support filtering on hosts: ["${host.join(
                '", "',
            )}"]`
            : `HTTP adapter does not support filtering on host: "${host}"`;

        return <T extends Record<string, any> = any, R = any>(req: T, res: R, next: () => void) => {
            (req as Record<string, any>).hosts = {};
            const hostname = httpAdapterRef.getRequestHostname(req) || '';

            for (const exp of hostRegExps) {
                const match = hostname.match(exp.regexp);
                if (match) {
                    exp.keys.forEach((key: any, i: any) => (req.hosts[key.name] = match[i + 1]));
                    return handler(req, res, next);
                }
            }
            if (!next) throw new InternalServerErrorException(unsupportedFilteringErrorMessage);
            return next();
        };
    }

    private createCallbackProxy(instance: ControllerType,
                                callback: RouterProxyCallback,
                                methodName: string,
                                moduleRef: string,
                                requestMethod: RequestMethod,
                                contextId = STATIC_CONTEXT,
                                inquirerId?: string) {
        const executionContext = this.executionContextCreator.create(
            instance, callback, methodName, moduleRef, requestMethod, contextId, inquirerId);
        const exceptionFilter = this.exceptionsFilter.create(
            instance, callback, moduleRef, contextId, inquirerId);
        return this.routerProxy?.createProxy(executionContext, exceptionFilter);
    }

    public createRequestScopedHandler(instanceWrapper: InstanceWrapper,
                                      requestMethod: RequestMethod,
                                      moduleRef: Module,
                                      moduleKey: string,
                                      methodName: string) {
        const {instance} = instanceWrapper;
        const collection = moduleRef.controllers;
        return async <T extends Record<any, any>, R>(req: T, res: R, next: () => void) => {
            try {
                const contextId = this.getContextId(req);
                const contextInstance = await this.injector?.loadPerContext(
                    instance, moduleRef, collection, contextId);
                await this.createCallbackProxy(
                    contextInstance, contextInstance[methodName], methodName, moduleKey, requestMethod, contextId, instanceWrapper.id,
                )(req, res, next);
            } catch (err) {
                let exceptionFilter = this.exceptionFiltersCache.get(instance[methodName]);
                if (!exceptionFilter) {
                    exceptionFilter = this.exceptionsFilter?.create(instance, instance[methodName], moduleKey);
                    this.exceptionFiltersCache.set(instance[methodName], exceptionFilter);
                }
                const host = new ExecutionContextHost([req, res, next]);
                exceptionFilter.next(err, host);
            }
        };
    }

    private getContextId<T extends Record<any, unknown> = any>(request: T): ContextId {
        const contextId = ContextIdFactory.getByRequest(request);
        if (!request[REQUEST_CONTEXT_ID as any]) {
            Object.defineProperty(request, REQUEST_CONTEXT_ID, {
                value: contextId,
                enumerable: false,
                writable: false,
                configurable: false,
            });
            this.container.registerRequestProvider(request, contextId);
        }
        return contextId;
    }
}
