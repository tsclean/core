import {
    ArgumentsHostInterface,
    ExceptionFilterInterface,
    HttpServer,
} from "../../contracts";
import {MESSAGES} from '../../app';
import {isObject} from "../../utils";
import {Logger} from "../../services";
import {HttpStatus} from "../../enums";
import {HttpException} from "../../exceptions";
import {HttpAdapterHost} from "../../helpers";
import {AbstractHttpAdapter} from '../adapters';
import {Inject, Optional} from "../../decorators";

export class BaseExceptionFilter<T = any> implements ExceptionFilterInterface<T> {
    private static readonly logger = new Logger('ExceptionsHandler');

    @Optional()
    @Inject()
    protected readonly httpAdapterHost?: HttpAdapterHost;

    constructor(
        protected readonly applicationRef?: HttpServer
    ) {
    }

    catch(exception: T, host: ArgumentsHostInterface) {
        const applicationRef = this.applicationRef || (this.httpAdapterHost && this.httpAdapterHost.httpAdapter);

        if (!(exception instanceof HttpException)) return this.handleUnknownError(exception, host, applicationRef);

        const res = exception.getResponse();
        const message = isObject(res)
            ? res
            : {
                statusCode: exception.getStatus(),
                message: res,
            };

        applicationRef.reply(host.getArgByIndex(1), message, exception.getStatus());
    }

    public handleUnknownError(exception: T, host: ArgumentsHostInterface, applicationRef: AbstractHttpAdapter | HttpServer) {
        const body = this.isHttpError(exception)
            ? {
                statusCode: exception.statusCode,
                message: exception.message,
            }
            : {
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
            };
        applicationRef.reply(host.getArgByIndex(1), body, body.statusCode);
        if (this.isExceptionObject(exception)) return BaseExceptionFilter.logger.error(exception.message, exception.stack);

        return BaseExceptionFilter.logger.error(exception);
    }

    public isExceptionObject(err: any): err is Error {
        return isObject(err) && !!(err as Error).message;
    }

    public isHttpError(err: any): err is { statusCode: number; message: string } {
        return err?.statusCode && err?.message;
    }
}
