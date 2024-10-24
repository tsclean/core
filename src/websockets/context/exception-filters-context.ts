import { WsExceptionsHandler } from '../../websockets/exceptions'
import { BaseExceptionFilterContext, ContainerIoC } from '../../core'
import { EXCEPTION_FILTERS_METADATA } from '../../helpers'
import { isEmpty } from '../../utils'

export class ExceptionFiltersContext extends BaseExceptionFilterContext {
  constructor (container: ContainerIoC) {
    super(container)
  }

  public create (
    instance: object,
    callback: <TClient>(client: TClient, data: any) => any,
    moduleKey: string
  ): WsExceptionsHandler {
    this.moduleContext = moduleKey

    const exceptionHandler = new WsExceptionsHandler()
    const filters = this.createContext(
      instance,
      callback,
      EXCEPTION_FILTERS_METADATA
    )
    if (isEmpty(filters)) {
      return exceptionHandler
    }
    exceptionHandler.setCustomFilters(filters.reverse())
    return exceptionHandler
  }

  public getGlobalMetadata<T extends any[]> (): T {
    return [] as T
  }
}
