import {ExecutionContextHost} from './execution-context-host';
import {HandlerTransform, Type} from "../contracts";
import {PARAMTYPES_METADATA, RESPONSE_PASSTHROUGH_METADATA} from "./constants";
import {isFunction} from "../utils/shared.utils";
import {ParamData} from "../decorators";
import {ContextType, ControllerType} from "../types";

export interface ParamProperties<T = any, IExtractor extends Function = any> {
    index: number;
    type: T | string;
    data: ParamData;
    handlers: HandlerTransform[];
    extractValue: IExtractor;
}

export class ContextUtils {
    public mapParamType(key: string): string {
        const keyPair = key.split(':');
        return keyPair[0];
    }

    public reflectCallbackParamTypes(instance: ControllerType, methodName: string): any[] {
        return Reflect.getMetadata(PARAMTYPES_METADATA, instance, methodName);
    }

    public reflectCallbackMetadata<T = any>(
        instance: ControllerType, methodName: string, metadataKey: string): T {
        return Reflect.getMetadata(metadataKey, instance.constructor, methodName);
    }

    public reflectPassThrough(instance: ControllerType, methodName: string): boolean {
        return Reflect.getMetadata(
            RESPONSE_PASSTHROUGH_METADATA, instance.constructor, methodName);
    }

    public getArgumentsLength<T>(keys: string[], metadata: T): number {
        return Math.max(...keys.map(key => metadata[key].index)) + 1;
    }

    public createNullArray(length: number): any[] {
        return Array.apply(null, {length} as any).fill(undefined);
    }

    public mergeParamsMetaTypes(paramsProperties: ParamProperties[], paramTypes: any[]): (ParamProperties & { metaType?: any })[] {
        if (!paramTypes) return paramsProperties;

        return paramsProperties.map(param => ({
            ...param,
            metaType: paramTypes[param.index],
        }));
    }

    public getCustomFactory(
        factory: (...args: unknown[]) => void, data: unknown, contextFactory: (args: unknown[]) => ExecutionContextHost): (...args: unknown[]) => unknown {
        return isFunction(factory)
            ? (...args: unknown[]) => factory(data, contextFactory(args)) : () => null;
    }

    public getContextFactory<T extends string = ContextType>(
        contextType: T, instance?: object, callback?: Function): (args: unknown[]) => ExecutionContextHost {

        return (args: unknown[]) => {
            const ctx = new ExecutionContextHost(
                args,
                instance && (instance.constructor as Type<unknown>),
                callback,
            );
            ctx.setType(contextType);
            return ctx;
        };
    }
}
