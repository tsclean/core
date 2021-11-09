import {ControllerType} from "../types";
import {ExceptionsHandler, ContextId} from '../core';


export interface ExceptionsFilterInterface {
    create(
        instance: ControllerType,
        callback: Function,
        module: string,
        contextId?: ContextId,
        inquirerId?: string,
    ): ExceptionsHandler;
}
