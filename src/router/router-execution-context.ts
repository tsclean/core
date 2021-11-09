import {ContextUtils} from '../helpers/context-utils';
import {
    HandlerMetadataStorage,
    ExecutionContextHost,
    ROUTE_ARGS_METADATA,
    REDIRECT_METADATA,
    HTTP_CODE_METADATA,
    RENDER_METADATA,
    HEADERS_METADATA,
    CUSTOM_ROUTE_AGRS_METADATA,
} from '../helpers';
import {InterceptorsConsumer, InterceptorsContextCreator} from '../interceptors';
import {
    CustomHeader,
    RedirectResponse,
    RouterResponseController,
} from './router-response-controller';
import {RequestMethod, RouteParamTypes} from "../enums";
import {RouteParamMetadata} from "../decorators";
import {
    AccessResourceInterface,
    HandlerMetadataInterface,
    HttpServer,
    ParamPropertiesInterface,
    HandlerTransform,
    RouteParamsFactoryInterface
} from "../contracts";
import {
    HandlersConsumer,
    HandlersContextCreator,
    STATIC_CONTEXT
} from "../core";
import {
    AccessResourceConsumer,
    AccessResourceContextCreator,
    FORBIDDEN_MESSAGE
} from "../access";
import {ContextType, ControllerType, HandlerResponseType} from "../types";
import {isEmpty, isString} from "../utils";
import {ForbiddenException} from "../exceptions";

export class RouterExecutionContext {
    private readonly handlerMetadataStorage = new HandlerMetadataStorage();
    private readonly contextUtils = new ContextUtils();
    private readonly responseController: RouterResponseController;

    constructor(
        private readonly paramsFactory: RouteParamsFactoryInterface,
        private readonly handlersContextCreator: HandlersContextCreator,
        private readonly handlersConsumer: HandlersConsumer,
        private readonly accessResourceContextCreator: AccessResourceContextCreator,
        private readonly accessResourceConsumer: AccessResourceConsumer,
        private readonly interceptorsContextCreator: InterceptorsContextCreator,
        private readonly interceptorsConsumer: InterceptorsConsumer,
        readonly applicationRef: HttpServer,
    ) {
        this.responseController = new RouterResponseController(applicationRef);
    }

    public create(instance: ControllerType,
                  callback: (...args: any[]) => unknown,
                  methodName: string,
                  moduleKey: string,
                  requestMethod: RequestMethod,
                  contextId = STATIC_CONTEXT,
                  inquirerId?: string) {
        const contextType: ContextType = 'http';
        const {
            argsLength,
            fnHandleResponse,
            paramTypes,
            getParamsMetadata,
            httpStatusCode,
            responseHeaders,
            hasCustomHeaders,
        } = this.getMetadata(instance, callback, methodName, moduleKey, requestMethod, contextType);

        const paramsOptions = this.contextUtils.mergeParamsMetaTypes(
            getParamsMetadata(moduleKey, contextId, inquirerId), paramTypes);

        const handlers = this.handlersContextCreator.create(
            instance, callback, moduleKey, contextId, inquirerId);

        const resources = this.accessResourceContextCreator.create(
            instance, callback, moduleKey, contextId, inquirerId);

        const interceptors = this.interceptorsContextCreator.create(
            instance, callback, moduleKey, contextId, inquirerId);

        const fnAccessResource = this.createAccessResourceFn(
            resources, instance, callback, contextType);

        const fnApplyHandlers = this.createHandlerFn(handlers, paramsOptions);

        const handler = <T, R>(args: any[], req: T, res: R, next: Function) =>
            async () => {
                fnApplyHandlers && (await fnApplyHandlers(args, req, res, next));
                return callback.apply(instance, args);
            };

        return async <T, R>(req: T, res: R, next: Function) => {
            const args = this.contextUtils.createNullArray(argsLength);
            fnAccessResource && (await fnAccessResource([req, res, next]));

            this.responseController.setStatus(res, httpStatusCode);
            hasCustomHeaders && this.responseController.setHeaders(res, responseHeaders);

            const result = await this.interceptorsConsumer.intercept(
                interceptors, [req, res, next], instance, callback, handler(args, req, res, next), contextType);
            await (fnHandleResponse as HandlerResponseType)(result, res, req);
        };
    }

    public getMetadata<T extends ContextType = ContextType>(
        instance: ControllerType,
        callback: (...args: any[]) => any,
        methodName: string,
        moduleKey: string,
        requestMethod: RequestMethod,
        contextType: T): HandlerMetadataInterface {

        const cacheMetadata = this.handlerMetadataStorage.get(instance, methodName);
        if (cacheMetadata) return cacheMetadata;

        const metadata = this.contextUtils.reflectCallbackMetadata(
            instance, methodName, ROUTE_ARGS_METADATA) || {};

        const keys = Object.keys(metadata);
        const argsLength = this.contextUtils.getArgumentsLength(keys, metadata);
        const paramTypes = this.contextUtils.reflectCallbackParamTypes(instance, methodName);
        const contextFactory = this.contextUtils.getContextFactory(contextType, instance, callback);
        const getParamsMetadata = (
            moduleKey: string,
            contextId = STATIC_CONTEXT,
            inquirerId?: string) => this.exchangeKeysForValues(
            keys, metadata, moduleKey, contextId, inquirerId, contextFactory);

        const paramsMetadata = getParamsMetadata(moduleKey);
        const isResponseHandled = this.isResponseHandled(instance, methodName, paramsMetadata);

        const httpRedirectResponse = this.reflectRedirect(callback);
        const fnHandleResponse = this.createHandleResponseFn(callback, isResponseHandled, httpRedirectResponse);

        const httpCode = this.reflectHttpStatusCode(callback);
        const httpStatusCode = httpCode
            ? httpCode : this.responseController.getStatusByMethod(requestMethod);

        const responseHeaders = this.reflectResponseHeaders(callback);
        const hasCustomHeaders = !isEmpty(responseHeaders);
        const handlerMetadata: HandlerMetadataInterface = {
            argsLength,
            fnHandleResponse,
            paramTypes,
            getParamsMetadata,
            httpStatusCode,
            hasCustomHeaders,
            responseHeaders,
        };
        this.handlerMetadataStorage.set(instance, methodName, handlerMetadata);
        return handlerMetadata;
    }

    public reflectRedirect(callback: (...args: unknown[]) => unknown): RedirectResponse {
        return Reflect.getMetadata(REDIRECT_METADATA, callback);
    }

    public reflectHttpStatusCode(callback: (...args: unknown[]) => unknown): number {
        return Reflect.getMetadata(HTTP_CODE_METADATA, callback);
    }

    public reflectRenderTemplate(callback: (...args: unknown[]) => unknown): string {
        return Reflect.getMetadata(RENDER_METADATA, callback);
    }

    public reflectResponseHeaders(callback: (...args: unknown[]) => unknown): CustomHeader[] {
        return Reflect.getMetadata(HEADERS_METADATA, callback) || [];
    }

    public exchangeKeysForValues(
        keys: string[],
        metadata: Record<number, RouteParamMetadata>,
        moduleContext: string,
        contextId = STATIC_CONTEXT,
        inquirerId?: string,
        contextFactory?: (args: unknown[]) => ExecutionContextHost): ParamPropertiesInterface[] {

        this.handlersContextCreator.setModuleContext(moduleContext);

        return keys.map(key => {
            const {index, data, handlers: handlersCollection} = metadata[key];
            const handlers = this.handlersContextCreator.createConcreteContext(
                handlersCollection, contextId, inquirerId
            );
            const type = this.contextUtils.mapParamType(key);

            if (key.includes(CUSTOM_ROUTE_AGRS_METADATA)) {
                const {factory} = metadata[key];
                const customExtractValue = this.contextUtils.getCustomFactory(
                    factory, data, contextFactory);
                return {index, extractValue: customExtractValue, type, data, handlers};
            }

            const numericType = Number(type);
            const extractValue = <T, R>(req: T, res: R, next: Function) =>
                this.paramsFactory.exchangeKeyForValue(numericType, data, {
                    req, res, next,
                });
            return {index, extractValue, type: numericType, data, handlers};
        });
    }

    public async getParamValue<T>(
        value: T,
        {
            metaType, type, data
        }: { metaType: unknown; type: RouteParamTypes; data: unknown },
        handlers: HandlerTransform[]): Promise<unknown> {

        if (!isEmpty(handlers)) {
            return this.handlersConsumer.apply(value, {metaType, type, data} as any, handlers);
        }
        return value;
    }

    public isHandlers(type: number | string): boolean {
        return (
            type === RouteParamTypes.BODY ||
            type === RouteParamTypes.QUERY ||
            type === RouteParamTypes.PARAM ||
            type === RouteParamTypes.FILE ||
            type === RouteParamTypes.FILES ||
            isString(type)
        );
    }

    public createAccessResourceFn<T extends string = ContextType>(
        resources: AccessResourceInterface[],
        instance: ControllerType,
        callback: (...args: any[]) => any,
        contextType?: T): (args: any[]) => Promise<void> | null {
        const accessResourceFn = async (args: any[]) => {
            const accessResource = await this.accessResourceConsumer.tryAccess<T>(
                resources, args, instance, callback, contextType);
            if (!accessResource) throw new ForbiddenException(FORBIDDEN_MESSAGE)
        };
        return resources.length ? accessResourceFn : null;
    }

    public createHandlerFn(handlers: HandlerTransform[], paramsOptions: (ParamPropertiesInterface & { metaType?: any })[]) {
        const handlersFn = async <T, R>(args: any[], req: T, res: R, next: Function) => {
            const resolveParamValue = async (param: ParamPropertiesInterface & { metaType?: any }) => {
                const {
                    index,
                    extractValue,
                    type,
                    data,
                    metaType,
                    handlers: paramHandler,
                } = param;

                const value = extractValue(req, res, next);

                args[index] = this.isHandlers(type)
                    ? await this.getParamValue(
                        value, {metaType, type, data} as any, handlers.concat(paramHandler))
                    : value;
            };
            await Promise.all(paramsOptions.map(resolveParamValue));
        };
        return paramsOptions.length ? handlersFn : null;
    }

    public createHandleResponseFn(
        callback: (...args: unknown[]) => unknown,
        isResponseHandled: boolean,
        redirectResponse?: RedirectResponse,
        httpStatusCode?: number,
    ): HandlerResponseType {
        const renderTemplate = this.reflectRenderTemplate(callback);
        if (renderTemplate) {
            return async <T, R>(result: T, res: R) => {
                return await this.responseController.render(result, res, renderTemplate);
            };
        }
        if (redirectResponse && typeof redirectResponse.url === 'string') {
            return async <T, R>(result: T, res: R) => {
                await this.responseController.redirect(result, res, redirectResponse);
            };
        }

        return async <T, R>(result: T, res: R) => {
            result = await this.responseController.transformToResult(result);
            !isResponseHandled && (await this.responseController.apply(result, res, httpStatusCode));
        };
    }

    private isResponseHandled(
        instance: ControllerType,
        methodName: string,
        paramsMetadata: ParamPropertiesInterface[],
    ): boolean {
        const hasResponseOrNextDecorator = paramsMetadata.some(
            ({type}) => type === RouteParamTypes.RESPONSE || type === RouteParamTypes.NEXT,
        );
        const isPassthroughsEnabled = this.contextUtils.reflectPassThrough(instance, methodName);
        return hasResponseOrNextDecorator && !isPassthroughsEnabled;
    }
}
