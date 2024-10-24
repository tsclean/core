import { isConstructor, isFunction, isNil } from '../utils'
import { InjectableType } from '../types'

export class MetadataScanner {
  private readonly cachedScannedPrototypes: Map<object, string[]> = new Map()

  /**
   * @deprecated
   * @see {@link getAllMethodNames}
   * @see getAllMethodNames
   */
  public scanFromPrototype<T extends InjectableType, R = any> (
    instance: T,
    prototype: object,
    callback: (name: string) => R
  ): R[] {
    if (!prototype) {
      return []
    }

    const visitedNames = new Map<string, boolean>()
    const result: R[] = []

    do {
      for (const property of Object.getOwnPropertyNames(prototype)) {
        if (visitedNames.has(property)) {
          continue
        }

        visitedNames.set(property, true)

        const descriptor = Object.getOwnPropertyDescriptor(prototype, property)

        if (
          descriptor.set ||
          descriptor.get ||
          isConstructor(property) ||
          !isFunction(prototype[property])
        ) {
          continue
        }

        const value = callback(property)

        if (isNil(value)) {
          continue
        }

        result.push(value)
      }
    } while (
      (prototype = Reflect.getPrototypeOf(prototype)) &&
      prototype !== Object.prototype
    )

    return result
  }

  /**
   * @deprecated
   * @see {@link getAllMethodNames}
   * @see getAllMethodNames
   */
  public *getAllFilteredMethodNames (
    prototype: object
  ): IterableIterator<string> {
    yield* this.getAllMethodNames(prototype)
  }

  public getAllMethodNames (prototype: object | null): string[] {
    if (!prototype) {
      return []
    }

    if (this.cachedScannedPrototypes.has(prototype)) {
      return this.cachedScannedPrototypes.get(prototype)
    }

    const visitedNames = new Map<string, boolean>()
    const result: string[] = []

    this.cachedScannedPrototypes.set(prototype, result)

    do {
      for (const property of Object.getOwnPropertyNames(prototype)) {
        if (visitedNames.has(property)) {
          continue
        }

        visitedNames.set(property, true)

        const descriptor = Object.getOwnPropertyDescriptor(prototype, property)

        if (
          descriptor.set ||
          descriptor.get ||
          isConstructor(property) ||
          !isFunction(prototype[property])
        ) {
          continue
        }

        result.push(property)
      }
    } while (
      (prototype = Reflect.getPrototypeOf(prototype)) &&
      prototype !== Object.prototype
    )

    return result
  }
}
