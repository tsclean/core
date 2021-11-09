import {Type} from './type';
import {AbstractInterface} from './abstract';
import {LoggerService, LogLevel} from '../services';
import {DynamicModuleInterface} from "./dynamic-module";

export interface ApplicationContextInterface {

    select<T>(module: Type<T> | DynamicModuleInterface): ApplicationContextInterface;

    get<T = any, R = T>(typeOrToken: Type<T> | AbstractInterface<T> | string | symbol,
                        options?: { strict: boolean }): R;

    resolve<T = any, R = T>(
        typeOrToken: Type<T> | AbstractInterface<T> | string | symbol, contextId?: { id: number }, options?: { strict: boolean }): Promise<R>;

    registerRequestByContextId<T = any>(request: T, contextId: { id: number }): void;

    close(): Promise<void>;

    useLogger(logger: LoggerService | LogLevel[] | false): void;

    init(): Promise<this>;
}
