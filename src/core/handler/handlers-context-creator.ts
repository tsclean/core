import {iterate} from 'iterare';
import {ApplicationConfig} from '../../app/application-config';
import {ContextCreator} from '../../helpers/context-creator';
import {STATIC_CONTEXT} from '../injector/constants';
import {ContainerIoC} from '../injector';
import {InstanceWrapper} from '../injector/instance-wrapper';
import {HandlerTransform, Type} from "../../contracts";
import {HANDLER_METADATA} from "../../helpers/constants";
import {isEmpty, isFunction} from "../../utils/shared.utils";
import {ControllerType} from "../../types";

export class HandlersContextCreator extends ContextCreator {
    private moduleContext: string;

    constructor(
        private readonly container: ContainerIoC,
        private readonly config?: ApplicationConfig,
    ) {
        super();
    }

    public create(
        instance: ControllerType, callback: (...args: unknown[]) => unknown,
        moduleKey: string, contextId = STATIC_CONTEXT, inquirerId?: string): HandlerTransform[] {
        this.moduleContext = moduleKey;
        return this.createContext(
            instance, callback, HANDLER_METADATA, contextId, inquirerId,
        );
    }

    public createConcreteContext<T extends any[], R extends any[]>(
        metadata: T, contextId = STATIC_CONTEXT, inquirerId?: string): R {
        if (isEmpty(metadata)) return [] as R;

        return iterate(metadata)
            .filter((handler: any) => handler && (handler.name || handler.transform))
            .map(handler => this.getHandlerInstance(handler, contextId, inquirerId))
            .filter(handler => handler && handler.transform && isFunction(handler.transform))
            .toArray() as R;
    }

    public getHandlerInstance(
        handler: Function | HandlerTransform, contextId = STATIC_CONTEXT, inquirerId?: string): HandlerTransform | null {

        const isObject = (handler as HandlerTransform).transform;
        if (isObject) return handler as HandlerTransform;

        const instanceWrapper = this.getInstanceByMetaType(handler as Type<unknown>);
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

    public getGlobalMetadata<T extends unknown[]>(contextId = STATIC_CONTEXT, inquirerId?: string): T {
        if (!this.config) return [] as T;

        const globalHandlers = this.config.getGlobalHandlers() as T;
        if (contextId === STATIC_CONTEXT && !inquirerId) return globalHandlers;

        const scopedPipeWrappers = this.config.getGlobalRequestHandlers() as InstanceWrapper[];
        const scopedPipes = iterate(scopedPipeWrappers)
            .map(wrapper => wrapper.getInstanceByContextId(contextId, inquirerId))
            .filter(host => !!host)
            .map(host => host.instance)
            .toArray();

        return globalHandlers.concat(scopedPipes) as T;
    }

    public setModuleContext(context: string) {
        this.moduleContext = context;
    }
}
