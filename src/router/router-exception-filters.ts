import {iterate} from 'iterare';
import {RouterProxyCallback} from './router-proxy';
import {BaseExceptionFilterContext, ExceptionsHandler, InstanceWrapper, ContainerIoC, STATIC_CONTEXT} from "../core";
import {ApplicationConfig} from "../app";
import {ControllerType} from "../types";
import {EXCEPTION_FILTERS_METADATA} from "../helpers";
import {isEmpty} from "../utils";
import {HttpServer} from "../contracts";


export class RouterExceptionFilters extends BaseExceptionFilterContext {
    constructor(
        container: ContainerIoC,
        private readonly config: ApplicationConfig,
        private readonly applicationRef: HttpServer,
    ) {
        super(container);
    }

    public create(
        instance: ControllerType,
        callback: RouterProxyCallback,
        moduleKey: string,
        contextId = STATIC_CONTEXT,
        inquirerId?: string,
    ): ExceptionsHandler {
        this.moduleContext = moduleKey;

        const exceptionHandler = new ExceptionsHandler(this.applicationRef);
        const filters = this.createContext(
            instance,
            callback,
            EXCEPTION_FILTERS_METADATA,
            contextId,
            inquirerId,
        );
        if (isEmpty(filters)) {
            return exceptionHandler;
        }
        exceptionHandler.setCustomFilters(filters.reverse());
        return exceptionHandler;
    }

    public getGlobalMetadata<T extends unknown[]>(
        contextId = STATIC_CONTEXT,
        inquirerId?: string,
    ): T {
        const globalFilters = this.config.getGlobalFilters() as T;
        if (contextId === STATIC_CONTEXT && !inquirerId) {
            return globalFilters;
        }
        const scopedFilterWrappers =
            this.config.getGlobalRequestFilters() as InstanceWrapper[];
        const scopedFilters = iterate(scopedFilterWrappers)
            .map(wrapper => wrapper.getInstanceByContextId(contextId, inquirerId))
            .filter(host => !!host)
            .map(host => host.instance)
            .toArray();

        return globalFilters.concat(scopedFilters) as T;
    }
}
