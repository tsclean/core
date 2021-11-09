import {Logger} from "../../services";
import {HttpException} from "../../exceptions";
import {ArgumentsHostInterface} from "../../contracts";



export class ExternalExceptionFilter<T = any, R = any> {
  private static readonly logger = new Logger('ExceptionsHandler');

  catch(exception: T, host: ArgumentsHostInterface): R | Promise<R> {
    if (exception instanceof Error && !(exception instanceof HttpException)) {
      ExternalExceptionFilter.logger.error(exception.message, exception.stack);
    }
    throw exception;
  }
}
