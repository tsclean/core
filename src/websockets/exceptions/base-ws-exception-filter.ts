import { MESSAGES } from "../../app/constants";
import { ArgumentsHostInterface, WsExceptionFilter } from "../../contracts";
import { Logger } from "../../services";
import { isObject } from "../../utils/shared.utils";
import { WsException } from "../../websockets/utils/ws-exception";

export class BaseWsExceptionFilter<TError = any>
  implements WsExceptionFilter<TError>
{
  private static readonly logger = new Logger('WsExceptionsHandler');

  public catch(exception: TError, host: ArgumentsHostInterface) {
    const client = host.switchToWs().getClient();
    this.handleError(client, exception);
  }

  public handleError<TClient extends { emit: Function }>(
    client: TClient,
    exception: TError,
  ) {
    if (!(exception instanceof WsException)) {
      return this.handleUnknownError(exception, client);
    }

    const status = 'error';
    const result = exception.getError();
    const message = isObject(result)
      ? result
      : {
          status,
          message: result,
        };

    client.emit('exception', message);
  }

  public handleUnknownError<TClient extends { emit: Function }>(
    exception: TError,
    client: TClient,
  ) {
    const status = 'error';
    client.emit('exception', {
      status,
      message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
    });

    if (this.isExceptionObject(exception)) {
      return BaseWsExceptionFilter.logger.error(
        exception.message,
        exception.stack,
      );
    }
    return BaseWsExceptionFilter.logger.error(exception);
  }

  public isExceptionObject(err: any): err is Error {
    return isObject(err) && !!(err as Error).message;
  }
}
