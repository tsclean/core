import { SCOPE_OPTIONS_METADATA } from '../helpers';
import { ScopeOptions } from '../contracts';

export function Service(options?: ScopeOptions): ClassDecorator {
    return (target: object) => {
        Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, options, target);
    };
}
