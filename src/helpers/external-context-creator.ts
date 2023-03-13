import {
    ExternalExceptionFilterContext,
    STATIC_CONTEXT,
    ContainerIoC,
    ContextId,
    ModulesContainer,
    HandlersConsumer,
    HandlersContextCreator
} from '../core';
import {
    FORBIDDEN_MESSAGE,
    AccessResourceConsumer,
    AccessResourceContextCreator
} from '../access';
import {InterceptorsConsumer, InterceptorsContextCreator} from '../interceptors';
import {ContextUtils, ParamProperties} from './context-utils';
import {ExternalErrorProxy} from './external-proxy';
import {HandlerMetadataStorage} from './handler-metadata-storage';
import {ExternalHandlerMetadataInterface, HandlerTransform} from "../contracts";
import {CUSTOM_ROUTE_AGRS_METADATA} from "./constants";
import {isEmpty} from "../utils";
import {ParamData} from "../decorators";
import {ForbiddenException} from "../exceptions";
import {ContextType, ControllerType, ParamsMetadataType} from "../types";
import {isObservable, lastValueFrom} from "rxjs";

export interface ParamsFactory {
    exchangeKeyForValue(type: number, data: ParamData, args: any): any;
}

export interface ExternalContextOptions {
    resources?: boolean;
    interceptors?: boolean;
    filters?: boolean;
}

export class ExternalContextCreator {
    private readonly contextUtils = new ContextUtils();
    private readonly externalErrorProxy = new ExternalErrorProxy();
    private readonly handlerMetadataStorage = new HandlerMetadataStorage<ExternalHandlerMetadataInterface>();
    private container: ContainerIoC;

    constructor(
        private readonly accessResourceContextCreator: AccessResourceContextCreator,
        private readonly accessResourceConsumer: AccessResourceConsumer,
        private readonly interceptorsContextCreator: InterceptorsContextCreator,
        private readonly interceptorsConsumer: InterceptorsConsumer,
        private readonly modulesContainer: ModulesContainer,
        private readonly handlersContextCreator: HandlersContextCreator,
        private readonly handlersConsumer: HandlersConsumer,
        private readonly filtersContextCreator: ExternalExceptionFilterContext,
    ) {
    }

    static fromContainer(container: ContainerIoC): ExternalContextCreator {
        const accessResourceContextCreator = new AccessResourceContextCreator(
            container, container.applicationConfig
        );
        const accessResourceConsumer = new AccessResourceConsumer();
        const interceptorsContextCreator = new InterceptorsContextCreator(
            container, container.applicationConfig
        );
        const interceptorsConsumer = new InterceptorsConsumer();
        const handlersContextCreator = new HandlersContextCreator(
            container, container.applicationConfig
        );
        const handlersConsumer = new HandlersConsumer();
        const filtersContextCreator = new ExternalExceptionFilterContext(
            container, container.applicationConfig,
        );

        const externalContextCreator = new ExternalContextCreator(
            accessResourceContextCreator,
            accessResourceConsumer,
            interceptorsContextCreator,
            interceptorsConsumer,
            container.getModules(),
            handlersContextCreator,
            handlersConsumer,
            filtersContextCreator,
        );
        externalContextCreator.container = container;
        return externalContextCreator;
    }

    public create<P extends ParamsMetadataType = ParamsMetadataType, T extends string = ContextType>(
        instance: ControllerType,
        callback: (...args: unknown[]) => unknown,
        methodName: string,
        metadataKey?: string,
        paramsFactory?: ParamsFactory,
        contextId = STATIC_CONTEXT,
        inquirerId?: string,
        options: ExternalContextOptions = {
            interceptors: true,
            resources: true,
            filters: true,
        },
        contextType: T = 'http' as T,
    ) {
        const module = this.getContextModuleKey(instance.constructor);
        const {argsLength, paramTypes, getParamsMetadata} = this.getMetadata<P, T>(
            instance, methodName, metadataKey, paramsFactory, contextType
        );
        const handlers = this.handlersContextCreator.create(
            instance, callback, module, contextId, inquirerId
        );
        const resources = this.accessResourceContextCreator.create(
            instance, callback, module, contextId, inquirerId
        );
        const exceptionFilter = this.filtersContextCreator.create(
            instance, callback, module, contextId, inquirerId
        );
        const interceptors = options.interceptors
            ? this.interceptorsContextCreator.create(
                instance, callback, module, contextId, inquirerId
            )
            : [];

        const paramsMetadata = getParamsMetadata(module, contextId, inquirerId);
        const paramsOptions = paramsMetadata
            ? this.contextUtils.mergeParamsMetaTypes(paramsMetadata, paramTypes) : [];

        const fnAccessResource = options.resources
            ? this.createAccessResourceFn(resources, instance, callback, contextType) : null;

        const fnApplyHandlers = this.createHandlersFn(handlers, paramsOptions);
        const handler = (initialArgs: unknown[], ...args: unknown[]) =>
            async () => {
                if (fnApplyHandlers) {
                    await fnApplyHandlers(initialArgs, ...args);
                    return callback.apply(instance, initialArgs);
                }
                return callback.apply(instance, args);
            };

        const target = async (...args: any[]) => {
            const initialArgs = this.contextUtils.createNullArray(argsLength);
            fnAccessResource && (await fnAccessResource(args));

            const result = await this.interceptorsConsumer.intercept(
                interceptors, args, instance, callback, handler(initialArgs, ...args), contextType,
            );
            return this.transformToResult(result);
        };
        return options.filters
            ? this.externalErrorProxy.createProxy(
                target, exceptionFilter, contextType,
            )
            : target;
    }

    public getMetadata<T, C extends string = ContextType>(
        instance: ControllerType,
        methodName: string,
        metadataKey?: string,
        paramsFactory?: ParamsFactory,
        contextType?: C,
    ): ExternalHandlerMetadataInterface {
        const cacheMetadata = this.handlerMetadataStorage.get(instance, methodName);
        if (cacheMetadata) return cacheMetadata;

        const metadata = this.contextUtils.reflectCallbackMetadata<T>(
            instance,
            methodName,
            metadataKey || '',
        ) || {};
        const keys = Object.keys(metadata);
        const argsLength = this.contextUtils.getArgumentsLength(keys, metadata);
        const paramTypes = this.contextUtils.reflectCallbackParamTypes(instance, methodName);
        const contextFactory = this.contextUtils.getContextFactory<C>(contextType, instance, instance[methodName]);
        const getParamsMetadata = (moduleKey: string, contextId = STATIC_CONTEXT, inquirerId?: string) =>
            paramsFactory
                ? this.exchangeKeysForValues(
                    keys,
                    metadata,
                    moduleKey,
                    paramsFactory,
                    contextId,
                    inquirerId,
                    contextFactory,
                )
                : null;

        const handlerMetadata: ExternalHandlerMetadataInterface = {
            argsLength,
            paramTypes,
            getParamsMetadata,
        };
        this.handlerMetadataStorage.set(instance, methodName, handlerMetadata);
        return handlerMetadata;
    }

    public getContextModuleKey(moduleCtor: Function | undefined): string {
        const emptyModuleKey = '';
        if (!moduleCtor) {
            return emptyModuleKey;
        }
        const moduleContainerEntries = this.modulesContainer.entries();
        for (const [key, moduleRef] of moduleContainerEntries) {
            if (moduleRef.hasProvider(moduleCtor)) {
                return key;
            }
        }
        return emptyModuleKey;
    }

    public exchangeKeysForValues<T = any>(
        keys: string[],
        metadata: T,
        moduleContext: string,
        paramsFactory: ParamsFactory,
        contextId = STATIC_CONTEXT,
        inquirerId?: string,
        contextFactory = this.contextUtils.getContextFactory('http'),
    ): ParamProperties[] {
        this.handlersContextCreator.setModuleContext(moduleContext);

        return keys.map(key => {
            const {index, data, handlers: handlersCollection} = metadata[key];
            const handlers = this.handlersContextCreator.createConcreteContext(
                handlersCollection,
                contextId,
                inquirerId,
            );
            const type = this.contextUtils.mapParamType(key);

            if (key.includes(CUSTOM_ROUTE_AGRS_METADATA)) {
                const {factory} = metadata[key];
                const customExtractValue = this.contextUtils.getCustomFactory(
                    factory,
                    data,
                    contextFactory,
                );
                return {index, extractValue: customExtractValue, type, data, handlers};
            }
            const numericType = Number(type);
            const extractValue = (...args: unknown[]) =>
                paramsFactory.exchangeKeyForValue(numericType, data, args);

            return {index, extractValue, type: numericType, data, handlers};
        });
    }

    public createHandlersFn(pipes: HandlerTransform[], paramsOptions: (ParamProperties & { metaType?: unknown })[]) {
        const handlerFn = async (args: unknown[], ...params: unknown[]) => {
            const resolveParamValue = async (param: ParamProperties & { metaType?: unknown }) => {
                const {
                    index,
                    extractValue,
                    type,
                    data,
                    metaType,
                    handlers: paramHandlers,
                } = param;
                const value = extractValue(...params);

                args[index] = await this.getParamValue(
                    value,
                    {metaType, type, data},
                    pipes.concat(paramHandlers),
                );
            };
            await Promise.all(paramsOptions.map(resolveParamValue));
        };
        return paramsOptions.length ? handlerFn : null;
    }

    public async getParamValue<T>(
        value: T,
        {metaType, type, data}: { metaType: any; type: any; data: any },
        handlers: HandlerTransform[]): Promise<any> {

        return isEmpty(handlers)
            ? value : this.handlersConsumer.apply(value, {metaType, type, data}, handlers);
    }

    public async transformToResult(resultOrDeferred: any) {
        if(isObservable(resultOrDeferred)) {
            return lastValueFrom(resultOrDeferred);
        }
        return resultOrDeferred;
    }

    public createAccessResourceFn<T extends string = ContextType>(
        resources: any[], instance: ControllerType, callback: (...args: any[]) => any,
        contextType?: T): Function | null {

        const accessResourceFn = async (args: any[]) => {
            const accessResource = await this.accessResourceConsumer.tryAccess<T>(
                resources, args, instance, callback, contextType);

            if (!accessResource) throw new ForbiddenException(FORBIDDEN_MESSAGE);

        };
        return resources.length ? accessResourceFn : null;
    }

    public registerRequestProvider<T = any>(request: T, contextId: ContextId) {
        this.container.registerRequestProvider<T>(request, contextId);
    }
}
