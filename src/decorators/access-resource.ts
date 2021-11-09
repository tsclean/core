import {RESOURCES_METADATA} from '../helpers';
import {AccessResourceInterface} from '../contracts';
import {extendArrayMetadata, isFunction, validateEach} from '../utils';

export function AccessResource(
    ...resources: (AccessResourceInterface | Function)[]): MethodDecorator & ClassDecorator {

    return (target: any, key?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => {
        const isAccessResourceValid = <T extends Function | Record<string, any>>(resource: T) =>
            resource && (isFunction(resource) || isFunction((resource as Record<string, any>).accessResource));

        if (descriptor) {
            validateEach(
                target.constructor, resources, isAccessResourceValid, '@AccessResource', 'resource'
            );
            extendArrayMetadata(RESOURCES_METADATA, resources, descriptor.value);
            return descriptor;
        }
        validateEach(target, resources, isAccessResourceValid, '@AccessResource', 'resource');
        extendArrayMetadata(RESOURCES_METADATA, resources, target);
        return target;
    };
}
