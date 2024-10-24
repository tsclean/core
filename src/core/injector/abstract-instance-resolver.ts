import {
  InvalidClassScopeException,
  UnknownElementException
} from '../../errors'
import { Type } from '../../contracts/type'
import { Injector } from './injector'
import { InstanceLink, InstanceLinksHost } from './instance-links-host'
import { Module } from './module'
import { ContextId } from './instance-wrapper'
import { AbstractInterface, GetOrResolveOptions, Scope } from '../../contracts'

export abstract class AbstractInstanceResolver {
  protected abstract instanceLinksHost: InstanceLinksHost
  protected abstract injector: Injector

  protected abstract get<T = any, R = T>(
    typeOrToken: Type<T> | Function | string | symbol,
    options?: GetOrResolveOptions
  ): R | Array<R>

  protected find<T = any, R = T> (
    typeOrToken: Type<T> | AbstractInterface<T> | string | symbol,
    options: { moduleId?: string; each?: boolean }
  ): R | Array<R> {
    const instanceLinkOrArray = this.instanceLinksHost.get<R>(
      typeOrToken,
      options
    )
    const pluckInstance = ({ wrapperRef }: InstanceLink) => {
      if (
        wrapperRef.scope === Scope.REQUEST ||
        wrapperRef.scope === Scope.TRANSIENT
      ) {
        throw new InvalidClassScopeException(typeOrToken)
      }
      return wrapperRef.instance
    }
    if (Array.isArray(instanceLinkOrArray)) {
      return instanceLinkOrArray.map(pluckInstance)
    }
    return pluckInstance(instanceLinkOrArray)
  }

  protected async resolvePerContext<TInput = any, TResult = TInput> (
    typeOrToken: Type<TInput> | AbstractInterface<TInput> | string | symbol,
    contextModule: Module,
    contextId: ContextId,
    options?: GetOrResolveOptions
  ): Promise<TResult | Array<TResult>> {
    const instanceLinkOrArray = options?.strict
      ? this.instanceLinksHost.get(typeOrToken, {
          moduleId: contextModule.id,
          each: options.each
        })
      : this.instanceLinksHost.get(typeOrToken, {
          each: options.each
        })

    const pluckInstance = async (instanceLink: InstanceLink) => {
      const { wrapperRef, collection } = instanceLink
      if (wrapperRef.isDependencyTreeStatic() && !wrapperRef.isTransient) {
        return this.get(typeOrToken, { strict: options.strict })
      }

      const ctorHost = wrapperRef.instance || { constructor: typeOrToken }
      const instance = await this.injector.loadPerContext(
        ctorHost,
        wrapperRef.host,
        collection,
        contextId,
        wrapperRef
      )
      if (!instance) {
        throw new UnknownElementException()
      }
      return instance
    }

    if (Array.isArray(instanceLinkOrArray)) {
      return Promise.all(
        instanceLinkOrArray.map(instanceLink => pluckInstance(instanceLink))
      )
    }
    return pluckInstance(instanceLinkOrArray)
  }
}
