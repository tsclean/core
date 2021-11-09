import {HandlerTransform, Type} from '../contracts';
import {CustomParamFactoryType} from "../types";
import {CUSTOM_ROUTE_AGRS_METADATA} from '../helpers';
import {ParamData, RouteParamMetadata,} from '../decorators';

export function assignCustomParameterMetadata(
    args: Record<number, RouteParamMetadata>,
    paramType: number | string,
    index: number,
    factory: CustomParamFactoryType,
    data?: ParamData,
    ...handlers: (Type<HandlerTransform> | HandlerTransform)[]) {

    return {
        ...args,
        [`${paramType}${CUSTOM_ROUTE_AGRS_METADATA}:${index}`]: {
            index,
            factory,
            data,
            handlers,
        },
    };
}
