import {STATIC_CONTEXT} from '../core/injector/constants';
import {ContextId} from '../core/injector';
import {ControllerType} from "../types";

export abstract class ContextCreator {
    public abstract createConcreteContext<T extends any[], R extends any[]>(
        metadata: T, contextId?: ContextId, inquirerId?: string): R;

    public getGlobalMetadata?<T extends any[]>(contextId?: ContextId, inquirerId?: string): T;

    public createContext<T extends unknown[] = any, R extends unknown[] = any>(
        instance: ControllerType, callback: (...args: any[]) => void,
        metadataKey: string, contextId = STATIC_CONTEXT, inquirerId?: string): R {
        const globalMetadata = this.getGlobalMetadata && this.getGlobalMetadata<T>(contextId, inquirerId);
        const classMetadata = this.reflectClassMetadata<T>(instance, metadataKey);
        const methodMetadata = this.reflectMethodMetadata<T>(callback, metadataKey);
        return [
            ...this.createConcreteContext<T, R>(
                globalMetadata || ([] as T),
                contextId,
                inquirerId,
            ),
            ...this.createConcreteContext<T, R>(classMetadata, contextId, inquirerId),
            ...this.createConcreteContext<T, R>(methodMetadata, contextId, inquirerId),
        ] as R;
    }

    public reflectClassMetadata<T>(instance: ControllerType, metadataKey: string): T {
        const prototype = Object.getPrototypeOf(instance);
        return Reflect.getMetadata(metadataKey, prototype.constructor);
    }

    public reflectMethodMetadata<T>(callback: (...args: unknown[]) => unknown, metadataKey: string): T {
        return Reflect.getMetadata(metadataKey, callback);
    }
}
