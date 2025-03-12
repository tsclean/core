import { GUARDS_METADATA } from '../helpers';
import { CanActivate } from '../contracts/can-activate';
import { extendArrayMetadata, isFunction, validateEach } from '../utils';

export function UseGuards(
  ...guards: (CanActivate | Function)[]
): MethodDecorator & ClassDecorator {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    const isGuardValid = <T extends Function | Record<string, any>>(guard: T) =>
      guard && (isFunction(guard) || isFunction(guard.canActivate));

    if (descriptor) {
      validateEach(
        target.constructor,
        guards,
        isGuardValid,
        '@UseGuards',
        'guard',
      );
      extendArrayMetadata(GUARDS_METADATA, guards, descriptor.value);
      return descriptor;
    }
    validateEach(target, guards, isGuardValid, '@UseGuards', 'guard');
    extendArrayMetadata(GUARDS_METADATA, guards, target);
    return target;
  };
}
