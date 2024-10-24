import { ControllerType } from 'types'
import { MetadataScanner } from '../app'
import { RequestMethod } from '../enums'
import { RouterProxyCallback } from './router-proxy'
import { addLeadingSlash, isString, isUndefined } from '../utils/shared.utils'
import { METHOD_METADATA, PATH_METADATA } from '../helpers'

export interface RouteDefinition {
  path: string[]
  requestMethod: RequestMethod
  targetCallback: RouterProxyCallback
  methodName: string
}

export class PathsExplorer {
  constructor (private readonly metadataScanner: MetadataScanner) {}

  public scanForPaths (
    instance: ControllerType,
    prototype?: object
  ): RouteDefinition[] {
    const instancePrototype = isUndefined(prototype)
      ? Object.getPrototypeOf(instance)
      : prototype

    return this.metadataScanner
      .getAllMethodNames(instancePrototype)
      .reduce((acc, method) => {
        const route = this.exploreMethodMetadata(
          instance,
          instancePrototype,
          method
        )

        if (route) {
          acc.push(route)
        }

        return acc
      }, [])
  }

  public exploreMethodMetadata (
    instance: ControllerType,
    prototype: object,
    methodName: string
  ): RouteDefinition | null {
    const instanceCallback = instance[methodName]
    const prototypeCallback = prototype[methodName]
    const routePath = Reflect.getMetadata(PATH_METADATA, prototypeCallback)
    if (isUndefined(routePath)) {
      return null
    }
    const requestMethod: RequestMethod = Reflect.getMetadata(
      METHOD_METADATA,
      prototypeCallback
    )

    const path = isString(routePath)
      ? [addLeadingSlash(routePath)]
      : routePath.map((p: string) => addLeadingSlash(p))

    return {
      path,
      requestMethod,
      targetCallback: instanceCallback,
      methodName
    }
  }
}
