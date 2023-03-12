import {extendArrayMetadata, isFunction, validateEach} from "../utils";
import {InterceptorInterface} from "../contracts";
import {INTERCEPTORS_METADATA} from "../helpers";

export function Interceptors(
    ...interceptors: (InterceptorInterface | Function)[]
): MethodDecorator & ClassDecorator {
    return (
        target: any,
        key?: string | symbol,
        descriptor?: TypedPropertyDescriptor<any>,
    ) => {
        const isInterceptorValid = <T extends Function | Record<string, any>>(
            interceptor: T,
        ) =>
            interceptor &&
            (isFunction(interceptor) ||
                isFunction((interceptor as Record<string, any>).intercept));

        if (descriptor) {
            validateEach(
                target.constructor,
                interceptors,
                isInterceptorValid,
                '@Interceptors',
                'interceptor',
            );
            extendArrayMetadata(
                INTERCEPTORS_METADATA,
                interceptors,
                descriptor.value,
            );
            return descriptor;
        }
        validateEach(
            target,
            interceptors,
            isInterceptorValid,
            '@Interceptors',
            'interceptor',
        );
        extendArrayMetadata(INTERCEPTORS_METADATA, interceptors, target);
        return target;
    };
}
