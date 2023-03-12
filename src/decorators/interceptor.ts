import {extendArrayMetadata, isFunction, validateEach} from "../utils";
import {InterceptorInterface} from "../contracts";
import {INTERCEPTORS_METADATA} from "../helpers";

/**
 * Decorator that binds interceptors to the scope of the controller or method,
 * depending on its context.
 *
 * When `@UseInterceptors` is used at the controller level, the interceptor will
 * be applied to every handler (method) in the controller.
 *
 * When `@UseInterceptors` is used at the individual handler level, the interceptor
 * will apply only to that specific method.
 *
 * @param interceptors a single interceptor instance or class, or a list of
 * interceptor instances or classes.
 *
 * @see [Interceptors](https://docs.nestjs.com/interceptors)
 *
 * @usageNotes
 * Interceptors can also be set up globally for all controllers and routes
 * using `app.useGlobalInterceptors()`.  [See here for details](https://docs.nestjs.com/interceptors#binding-interceptors)
 *
 * @publicApi
 */
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
                '@UseInterceptors',
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
            '@UseInterceptors',
            'interceptor',
        );
        extendArrayMetadata(INTERCEPTORS_METADATA, interceptors, target);
        return target;
    };
}
