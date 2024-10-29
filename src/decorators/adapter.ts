import {isUndefined} from "../utils";
import {PARAMTYPES_METADATA, PROPERTY_DEPS_METADATA, SELF_DECLARED_DEPS_METADATA} from "../helpers";

export function Adapter<T = any>(token?: T): PropertyDecorator & ParameterDecorator {
    const injectCallHasArguments = arguments.length > 0;

    return (target: object, key: string | symbol, index?: number) => {
        let type = token || Reflect.getMetadata('design:type', target, key);

        if (!type && !injectCallHasArguments) {
            type = Reflect.getMetadata(PARAMTYPES_METADATA, target, key)?.[index];
        }

        if (!isUndefined(index)) {
            let dependencies =
                Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, target) || [];

            dependencies = [...dependencies, { index, param: type }];
            Reflect.defineMetadata(SELF_DECLARED_DEPS_METADATA, dependencies, target);
            return;
        }
        let properties =
            Reflect.getMetadata(PROPERTY_DEPS_METADATA, target.constructor) || [];

        properties = [...properties, { key, type }];
        Reflect.defineMetadata(
            PROPERTY_DEPS_METADATA,
            properties,
            target.constructor,
        );
    };
}