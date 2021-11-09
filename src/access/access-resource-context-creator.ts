import {iterate} from 'iterare';
import {ApplicationConfig} from '../app';
import {isEmpty, isFunction} from "../utils";
import {ContextCreator, RESOURCES_METADATA} from '../helpers';
import {InstanceWrapper, ContainerIoC, STATIC_CONTEXT} from '../core';
import {AccessResourceInterface, Type} from "../contracts";
import {ControllerType} from "../types";

export class AccessResourceContextCreator extends ContextCreator {
    private moduleContext: string;

    constructor(
        private readonly container: ContainerIoC,
        private readonly config?: ApplicationConfig,
    ) {
        super();
    }

    public create(instance: ControllerType, callback: (...args: unknown[]) => unknown, module: string,
                  contextId = STATIC_CONTEXT, inquirerId?: string): AccessResourceInterface[] {
        this.moduleContext = module;
        return this.createContext(instance, callback, RESOURCES_METADATA, contextId, inquirerId);
    }

    public createConcreteContext<T extends unknown[], R extends unknown[]>(
        metadata: T, contextId = STATIC_CONTEXT, inquirerId?: string): R {

        if (isEmpty(metadata)) return [] as R;

        return iterate(metadata)
            .filter((resource: any) => resource && (resource.name || resource.accessResource))
            .map(resource => this.getGuardInstance(resource as Function, contextId, inquirerId))
            .filter((resource: AccessResourceInterface) => resource && isFunction(resource.accessResource))
            .toArray() as R;
    }

    public getGuardInstance(metaType: Function | AccessResourceInterface, contextId = STATIC_CONTEXT,
                            inquirerId?: string): AccessResourceInterface | null {

        const isObject = (metaType as AccessResourceInterface).accessResource;
        if (isObject) return metaType as AccessResourceInterface;

        const instanceWrapper = this.getInstanceByMetaType(metaType as Type<unknown>);
        if (!instanceWrapper) return null;

        const instanceHost = instanceWrapper.getInstanceByContextId(contextId, inquirerId);
        return instanceHost && instanceHost.instance;
    }

    public getInstanceByMetaType(metaType: Type<unknown>): InstanceWrapper | undefined {
        if (!this.moduleContext) return;
        const collection = this.container.getModules();
        const moduleRef = collection.get(this.moduleContext);
        if (!moduleRef) return;

        const injectables = moduleRef.injectables;
        return injectables.get(metaType);
    }

    public getGlobalMetadata<T extends unknown[]>(
        contextId = STATIC_CONTEXT, inquirerId?: string): T {

        if (!this.config) return [] as T;

        const globalAccessResources = this.config.getGlobalAccessResources() as T;
        if (contextId === STATIC_CONTEXT && !inquirerId) return globalAccessResources;

        const scopedResourceWrappers = this.config.getGlobalRequestAccessResource() as InstanceWrapper[];
        const scopedResources = iterate(scopedResourceWrappers)
            .map(wrapper => wrapper.getInstanceByContextId(contextId, inquirerId))
            .filter(host => !!host)
            .map(host => host.instance)
            .toArray();

        return globalAccessResources.concat(scopedResources) as T;
    }
}
