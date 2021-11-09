import {iterate} from 'iterare';
import {ApplicationConfig} from '../app';
import {ControllerType} from "../types";
import {isEmpty, isFunction} from "../utils";
import {InterceptorInterface, Type} from "../contracts";
import {ContextCreator, INTERCEPTORS_METADATA} from '../helpers';
import {STATIC_CONTEXT, ContainerIoC, InstanceWrapper} from '../core';

export class InterceptorsContextCreator extends ContextCreator {
    private moduleContext: string;

    constructor(
        private readonly container: ContainerIoC,
        private readonly config?: ApplicationConfig,
    ) {
        super();
    }

    public create(
        instance: ControllerType,
        callback: (...args: unknown[]) => unknown,
        module: string,
        contextId = STATIC_CONTEXT,
        inquirerId?: string,
    ): InterceptorInterface[] {
        this.moduleContext = module;
        return this.createContext(
            instance,
            callback,
            INTERCEPTORS_METADATA,
            contextId,
            inquirerId,
        );
    }

    public createConcreteContext<T extends any[], R extends any[]>(
        metadata: T,
        contextId = STATIC_CONTEXT,
        inquirerId?: string,
    ): R {
        if (isEmpty(metadata)) {
            return [] as R;
        }
        return iterate(metadata)
            .filter(
                interceptor =>
                    interceptor && (interceptor.name || interceptor.intercept),
            )
            .map(interceptor =>
                this.getInterceptorInstance(interceptor, contextId, inquirerId),
            )
            .filter(
                (interceptor: InterceptorInterface) =>
                    interceptor && isFunction(interceptor.intercept),
            )
            .toArray() as R;
    }

    public getInterceptorInstance(
        metatype: Function | InterceptorInterface,
        contextId = STATIC_CONTEXT,
        inquirerId?: string,
    ): InterceptorInterface | null {
        const isObject = (metatype as InterceptorInterface).intercept;
        if (isObject) {
            return metatype as InterceptorInterface;
        }
        const instanceWrapper = this.getInstanceByMetatype(
            metatype as Type<unknown>,
        );
        if (!instanceWrapper) {
            return null;
        }
        const instanceHost = instanceWrapper.getInstanceByContextId(
            contextId,
            inquirerId,
        );
        return instanceHost && instanceHost.instance;
    }

    public getInstanceByMetatype(
        metatype: Type<unknown>,
    ): InstanceWrapper | undefined {
        if (!this.moduleContext) {
            return;
        }
        const collection = this.container.getModules();
        const moduleRef = collection.get(this.moduleContext);
        if (!moduleRef) {
            return;
        }
        return moduleRef.injectables.get(metatype);
    }

    public getGlobalMetadata<T extends unknown[]>(
        contextId = STATIC_CONTEXT,
        inquirerId?: string,
    ): T {
        if (!this.config) {
            return [] as T;
        }
        const globalInterceptors = this.config.getGlobalInterceptors() as T;
        if (contextId === STATIC_CONTEXT && !inquirerId) {
            return globalInterceptors;
        }
        const scopedInterceptorWrappers =
            this.config.getGlobalRequestInterceptors() as InstanceWrapper[];
        const scopedInterceptors = iterate(scopedInterceptorWrappers)
            .map(wrapper => wrapper.getInstanceByContextId(contextId, inquirerId))
            .filter(host => !!host)
            .map(host => host.instance)
            .toArray();

        return globalInterceptors.concat(scopedInterceptors) as T;
    }
}
