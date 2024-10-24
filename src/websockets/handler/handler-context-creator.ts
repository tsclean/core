import iterate from 'iterare'
import { ApplicationConfig } from '../../app'
import { HandlerTransform, Type } from '../../contracts'
import { ContainerIoC, InstanceWrapper, STATIC_CONTEXT } from '../../core'
import { ContextCreator, HANDLER_METADATA } from '../../helpers'
import { ControllerType } from '../../types'
import { isEmpty, isFunction } from '../../utils'

export class HandlerContextCreator extends ContextCreator {
  private moduleContext: string

  constructor (
    private readonly container: ContainerIoC,
    private readonly config?: ApplicationConfig
  ) {
    super()
  }

  public create (
    instance: ControllerType,
    callback: (...args: unknown[]) => unknown,
    moduleKey: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string
  ): HandlerTransform[] {
    this.moduleContext = moduleKey
    return this.createContext(
      instance,
      callback,
      HANDLER_METADATA,
      contextId,
      inquirerId
    )
  }

  public createConcreteContext<T extends any[], R extends any[]> (
    metadata: T,
    contextId = STATIC_CONTEXT,
    inquirerId?: string
  ): R {
    if (isEmpty(metadata)) {
      return [] as R
    }
    return iterate(metadata)
      .filter((pipe: any) => pipe && (pipe.name || pipe.transform))
      .map(pipe => this.getPipeInstance(pipe, contextId, inquirerId))
      .filter(pipe => pipe && pipe.transform && isFunction(pipe.transform))
      .toArray() as R
  }

  public getPipeInstance (
    handler: Function | HandlerTransform,
    contextId = STATIC_CONTEXT,
    inquirerId?: string
  ): HandlerTransform | null {
    const isObject = (handler as HandlerTransform).transform
    if (isObject) {
      return handler as HandlerTransform
    }
    const instanceWrapper = this.getInstanceByMetatype(handler as Type<unknown>)
    if (!instanceWrapper) {
      return null
    }
    const instanceHost = instanceWrapper.getInstanceByContextId(
      this.getContextId(contextId, instanceWrapper),
      inquirerId
    )
    return instanceHost && instanceHost.instance
  }

  public getInstanceByMetatype (
    metatype: Type<unknown>
  ): InstanceWrapper | undefined {
    if (!this.moduleContext) {
      return
    }
    const collection = this.container.getModules()
    const moduleRef = collection.get(this.moduleContext)
    if (!moduleRef) {
      return
    }
    return moduleRef.injectables.get(metatype)
  }

  public getGlobalMetadata<T extends unknown[]> (
    contextId = STATIC_CONTEXT,
    inquirerId?: string
  ): T {
    if (!this.config) {
      return [] as T
    }
    const handlerPipes = this.config.getGlobalHandlers() as T
    if (contextId === STATIC_CONTEXT && !inquirerId) {
      return handlerPipes
    }
    const scopedPipeWrappers =
      this.config.getGlobalRequestHandlers() as InstanceWrapper[]
    const scopedPipes = iterate(scopedPipeWrappers)
      .map(wrapper =>
        wrapper.getInstanceByContextId(
          this.getContextId(contextId, wrapper),
          inquirerId
        )
      )
      .filter(host => !!host)
      .map(host => host.instance)
      .toArray()

    return handlerPipes.concat(scopedPipes) as T
  }

  public setModuleContext (context: string) {
    this.moduleContext = context
  }
}
