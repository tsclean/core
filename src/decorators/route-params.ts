import {
    RESPONSE_PASSTHROUGH_METADATA,
    ROUTE_ARGS_METADATA,
} from '../helpers/constants';
import {RouteParamTypes} from '../enums/route-paramtypes';
import {HandlerTransform} from '../contracts';
import {Type} from '../contracts';
import {isNil, isString} from '../utils/shared.utils';

export interface ResponseDecoratorOptions {
    passThrough: boolean;
}

export type ParamData = object | string | number;

export interface RouteParamMetadata {
    index: number;
    data?: ParamData;
}

export function assignMetadata<T = any, R = any>(
    args: R, paramType: T, index: number, data?: ParamData,
    ...handlers: (Type<HandlerTransform> | HandlerTransform)[]) {
    return {
        ...args,
        [`${paramType}:${index}`]: {
            index,
            data,
            handlers,
        },
    };
}

function createRouteParamDecorator(paramType: RouteParamTypes) {
    return (data?: ParamData): ParameterDecorator =>
        (target, key, index) => {
            const args =
                Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) || {};
            Reflect.defineMetadata(
                ROUTE_ARGS_METADATA,
                assignMetadata<RouteParamTypes, Record<number, RouteParamMetadata>>(
                    args,
                    paramType,
                    index,
                    data,
                ),
                target.constructor,
                key,
            );
        };
}

const createHandlerRouteParamDecorator =
    (paramType: RouteParamTypes) =>
        (
            data?: any,
            ...pipes: (Type<HandlerTransform> | HandlerTransform)[]
        ): ParameterDecorator =>
            (target, key, index) => {
                const args =
                    Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) || {};
                const hasParamData = isNil(data) || isString(data);
                const paramData = hasParamData ? data : undefined;
                const paramPipes = hasParamData ? pipes : [data, ...pipes];

                Reflect.defineMetadata(
                    ROUTE_ARGS_METADATA,
                    assignMetadata(args, paramType, index, paramData, ...paramPipes),
                    target.constructor,
                    key,
                );
            };

export const Request: () => ParameterDecorator = createRouteParamDecorator(
    RouteParamTypes.REQUEST,
);

export const Response: (options?: ResponseDecoratorOptions) => ParameterDecorator =
    (options?: ResponseDecoratorOptions) => (target, key, index) => {
        if (options?.passThrough) {
            Reflect.defineMetadata(
                RESPONSE_PASSTHROUGH_METADATA,
                options?.passThrough,
                target.constructor,
                key,
            );
        }
        return createRouteParamDecorator(RouteParamTypes.RESPONSE)()(
            target,
            key,
            index,
        );
    };

export const Headers: (property?: string) => ParameterDecorator =
    createRouteParamDecorator(RouteParamTypes.HEADERS);

export function Query(): ParameterDecorator;

export function Query(...handlers: (Type<HandlerTransform> | HandlerTransform)[]): ParameterDecorator;

export function Query(property: string,
    ...handlers: (Type<HandlerTransform> | HandlerTransform)[]
): ParameterDecorator;

export function Query(
    property?: string | (Type<HandlerTransform> | HandlerTransform), ...handlers: (Type<HandlerTransform> | HandlerTransform)[]
): ParameterDecorator {
    return createHandlerRouteParamDecorator(RouteParamTypes.QUERY)(
        property,
        ...handlers,
    );
}

export function Body(): ParameterDecorator;

export function Body(...handlers: (Type<HandlerTransform> | HandlerTransform)[]): ParameterDecorator;

export function Body(property: string, ...handlers: (Type<HandlerTransform> | HandlerTransform)[]): ParameterDecorator;

export function Body(
    property?: string | (Type<HandlerTransform> | HandlerTransform),
    ...handlers: (Type<HandlerTransform> | HandlerTransform)[]
): ParameterDecorator {
    return createHandlerRouteParamDecorator(RouteParamTypes.BODY)(
        property,
        ...handlers,
    );
}

export function Param(): ParameterDecorator;

export function Param(...handlers: (Type<HandlerTransform> | HandlerTransform)[]): ParameterDecorator;

export function Param(
    property: string, ...handlers: (Type<HandlerTransform> | HandlerTransform)[]
): ParameterDecorator;

export function Param(
    property?: string | (Type<HandlerTransform> | HandlerTransform),
    ...handlers: (Type<HandlerTransform> | HandlerTransform)[]
): ParameterDecorator {
    return createHandlerRouteParamDecorator(RouteParamTypes.PARAM)(
        property,
        ...handlers,
    );
}

export function UploadedFile(): ParameterDecorator;

export function UploadedFile(
    ...handlers: (Type<HandlerTransform> | HandlerTransform)[]
): ParameterDecorator;

export function UploadedFile(
    fileKey?: string,
    ...handlers: (Type<HandlerTransform> | HandlerTransform)[]
): ParameterDecorator;

export function UploadedFile(
    fileKey?: string | (Type<HandlerTransform> | HandlerTransform),
    ...handlers: (Type<HandlerTransform> | HandlerTransform)[]
): ParameterDecorator {
    return createHandlerRouteParamDecorator(RouteParamTypes.FILE)(
        fileKey,
        ...handlers,
    );
}

export function UploadedFiles(): ParameterDecorator;

export function UploadedFiles(
    ...handlers: (Type<HandlerTransform> | HandlerTransform)[]
): ParameterDecorator;

export function UploadedFiles(
    ...handlers: (Type<HandlerTransform> | HandlerTransform)[]
): ParameterDecorator {
    return createHandlerRouteParamDecorator(RouteParamTypes.FILES)(
        undefined,
        ...handlers,
    );
}

export const Req = Request;
export const Res = Response;
