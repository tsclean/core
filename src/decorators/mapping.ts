import {
  HOST_METADATA,
  PATH_METADATA,
  SCOPE_OPTIONS_METADATA,
} from '../helpers';
import { isString, isUndefined } from '../utils';
import { ScopeOptions } from '../contracts';

export interface MappingOptions extends ScopeOptions {

  path?: string | string[];

  host?: string | RegExp | Array<string | RegExp>;
}

export function Mapping(): ClassDecorator;

export function Mapping(prefix: string | string[]): ClassDecorator;

export function Mapping(options: MappingOptions): ClassDecorator;

export function Mapping(
    prefixOrOptions?: string | string[] | MappingOptions): ClassDecorator {

  const defaultPath = '/';

  const [path, host, scopeOptions] = isUndefined(prefixOrOptions)
    ? [defaultPath, undefined, undefined, undefined]
    : isString(prefixOrOptions) || Array.isArray(prefixOrOptions)
    ? [prefixOrOptions, undefined, undefined, undefined]
    : [
        prefixOrOptions.path || defaultPath,
        prefixOrOptions.host,
        { scope: prefixOrOptions.scope }
      ];

  return (target: object) => {
    Reflect.defineMetadata(PATH_METADATA, path, target);
    Reflect.defineMetadata(HOST_METADATA, host, target);
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, scopeOptions, target);
  };
}
