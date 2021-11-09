import {v4 as uuid} from 'uuid';

import {ROUTE_ARGS_METADATA} from '../helpers';
import {CustomParamFactoryType} from "../types";
import {Type, HandlerTransform} from '../contracts';
import {assignCustomParameterMetadata, isFunction, isNil} from '../utils';

export type ParamDecoratorEnhancer = ParameterDecorator;

export function createParamDecorator<T = any, I = any, O = any>(
    factory: CustomParamFactoryType<T, I, O>,
    enhancers: ParamDecoratorEnhancer[] = []): (
    ...dataOrPipes: (Type<HandlerTransform> | HandlerTransform | T)[]
) => ParameterDecorator {
    const paramType = uuid();
    return (data?, ...pipes: (Type<HandlerTransform> | HandlerTransform | T)[]): ParameterDecorator =>
        (target, key, index) => {
            const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) || {};

            const isHandler = (handler: any) => handler &&
                ((isFunction(handler) &&
                        handler.prototype &&
                        isFunction(handler.prototype.transform)) ||
                    isFunction(handler.transform));

            const hasParamData = isNil(data) || !isHandler(data);
            const paramData = hasParamData ? (data as any) : undefined;
            const paramPipes = hasParamData ? pipes : [data, ...pipes];

            Reflect.defineMetadata(
                ROUTE_ARGS_METADATA,
                assignCustomParameterMetadata(
                    args,
                    paramType,
                    index,
                    factory,
                    paramData,
                    ...(paramPipes as HandlerTransform[]),
                ),
                target.constructor,
                key,
            );
            enhancers.forEach(fn => fn(target, key, index));
        };
}
