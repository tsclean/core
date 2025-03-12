export function flatten<T>(arr: T[]): T extends (infer R)[] ? R[] : T[] {
  const flat: unknown[] = [].concat(...arr); // Usamos unknown[] en lugar de any[]
  return flat.some(Array.isArray)
    ? (flatten(flat as any[]) as T extends (infer R)[] ? R[] : T[])
    : (flat as T extends (infer R)[] ? R[] : T[]);
}

export const isUndefined = (obj: any): obj is undefined =>
  typeof obj === 'undefined'

export const isObject = (fn: any): fn is object =>
  !isNil(fn) && typeof fn === 'object'

export const isPlainObject = (fn: any): fn is object => {
  if (!isObject(fn)) {
    return false
  }
  const proto = Object.getPrototypeOf(fn)
  if (proto === null) {
    return true
  }
  const ctor =
    Object.prototype.hasOwnProperty.call(proto, 'constructor') &&
    proto.constructor
  return (
    typeof ctor === 'function' &&
    ctor instanceof ctor &&
    Function.prototype.toString.call(ctor) ===
    Function.prototype.toString.call(Object)
  )
}

export const addLeadingSlash = (path?: string): string =>
  path && typeof path === 'string'
    ? path.charAt(0) !== '/'
      ? '/' + path
      : path
    : ''

export const stripEndSlash = (path: string) =>
  path[path.length - 1] === '/' ? path.slice(0, path.length - 1) : path

export const normalizePath = (path?: string): string =>
  path
    ? path.startsWith('/')
      ? ('/' + path.replace(/\/+$/, '')).replace(/\/+/g, '/')
      : '/' + path.replace(/\/+$/, '')
    : '/'

export const isFunction = (val: any): val is Function =>
  typeof val === 'function';

export const isString = (fn: any): fn is string => typeof fn === 'string'
export const isConstructor = (fn: any): boolean => fn === 'constructor'
export const isNil = (obj: any): obj is null | undefined =>
  isUndefined(obj) || obj === null
export const isEmpty = (array: any): boolean => !(array && array.length > 0)
export const isSymbol = (fn: any): fn is symbol => typeof fn === 'symbol'
