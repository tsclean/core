import {iterate} from 'iterare';
import {ContextCreator} from '../../helpers';
import {isEmpty, isFunction} from "../../utils";
import {FILTER_CATCH_EXCEPTIONS} from "../../helpers";
import {ExceptionFilterInterface, Type} from "../../contracts";
import {InstanceWrapper, ContainerIoC, STATIC_CONTEXT} from '../injector';

export class BaseExceptionFilterContext extends ContextCreator {
    protected moduleContext: string;

    constructor(
        private readonly container: ContainerIoC
    ) {
        super();
    }

    public createConcreteContext<T extends any[], R extends any[]>(
        metadata: T, contextId = STATIC_CONTEXT, inquirerId?: string): R {
        if (isEmpty(metadata)) return [] as R;

        return iterate(metadata)
            .filter(instance => instance && (isFunction(instance.catch) || instance.name))
            .map(filter => this.getFilterInstance(filter, contextId, inquirerId))
            .filter(item => !!item)
            .map(instance => ({
                func: instance.catch.bind(instance),
                exceptionMetaTypes: this.reflectCatchExceptions(instance),
            }))
            .toArray() as R;
    }

    public getFilterInstance(filter: Function | ExceptionFilterInterface,
                             contextId = STATIC_CONTEXT,
                             inquirerId?: string): ExceptionFilterInterface | null {
        const isObject = (filter as ExceptionFilterInterface).catch;
        if (isObject) return filter as ExceptionFilterInterface;

        const instanceWrapper = this.getInstanceByMetaType(filter as Type<unknown>);
        if (!instanceWrapper) return null;

        const instanceHost = instanceWrapper.getInstanceByContextId(contextId, inquirerId);
        return instanceHost && instanceHost.instance;
    }

    public getInstanceByMetaType(metaType: Type<unknown>): InstanceWrapper | undefined {
        if (!this.moduleContext) return;
        const collection = this.container.getModules();
        const moduleRef = collection.get(this.moduleContext);
        if (!moduleRef) return;

        return moduleRef.injectables.get(metaType);
    }

    public reflectCatchExceptions(instance: ExceptionFilterInterface): Type<any>[] {
        const prototype = Object.getPrototypeOf(instance);
        return (Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, prototype.constructor) || []);
    }
}
