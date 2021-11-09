import { HEADERS_METADATA } from '../helpers';
import { extendArrayMetadata } from '../utils';

export function Header(name: string, value: string): MethodDecorator {
  return (target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    extendArrayMetadata(HEADERS_METADATA, [{ name, value }], descriptor.value);
    return descriptor;
  };
}
