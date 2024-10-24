import { ArgumentsHostInterface, ExceptionFilterMetadataInterface } from '../../contracts'
import { BaseWsExceptionFilter } from './base-ws-exception-filter'
import { WsException } from '../../websockets/utils/ws-exception'
import { InvalidExceptionFilterException } from '../../errors'
import { isEmpty } from '../../utils/shared.utils'
import { selectExceptionFilterMetadata } from '../../utils'

export class WsExceptionsHandler extends BaseWsExceptionFilter {
  private filters: ExceptionFilterMetadataInterface[] = []

  public handle (
    exception: Error | WsException | any,
    host: ArgumentsHostInterface
  ) {
    const client = host.switchToWs().getClient()
    if (this.invokeCustomFilters(exception, host) || !client.emit) {
      return
    }
    super.catch(exception, host)
  }

  public setCustomFilters (filters: ExceptionFilterMetadataInterface[]) {
    if (!Array.isArray(filters)) {
      throw new InvalidExceptionFilterException()
    }
    this.filters = filters
  }

  public invokeCustomFilters<T = any> (
    exception: T,
    args: ArgumentsHostInterface
  ): boolean {
    if (isEmpty(this.filters)) return false

    const filter = selectExceptionFilterMetadata(this.filters, exception)
    filter && filter.func(exception, args)
    return !!filter
  }
}
