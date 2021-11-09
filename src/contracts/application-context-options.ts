import {LoggerService, LogLevel} from '../services';

export interface ApplicationContextOptionsInterface {

    logger?: LoggerService | LogLevel[] | false;

    abortOnError?: boolean | undefined;

    bufferLogs?: boolean;

    autoFlushLogs?: boolean;
}
