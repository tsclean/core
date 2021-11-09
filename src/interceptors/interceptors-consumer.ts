import {isEmpty} from "../utils";
import {ExecutionContextHost} from '../helpers';
import {ContextType, ControllerType} from "../types";

import {InterceptorInterface, Type} from "../contracts";

export class InterceptorsConsumer {

    public async intercept<T extends string = ContextType>(interceptors: InterceptorInterface[],
                                                           args: unknown[],
                                                           instance: ControllerType,
                                                           callback: (...args: unknown[]) => unknown,
                                                           next: () => Promise<unknown>,
                                                           type?: T): Promise<unknown> {

        if (isEmpty(interceptors)) return next();

        const context = this.createContext(args, instance, callback);
        context.setType<T>(type);
    }

    public createContext(args: unknown[], instance: ControllerType, callback: (...args: unknown[]) => unknown): ExecutionContextHost {
        return new ExecutionContextHost(
            args, instance.constructor as Type<unknown>, callback);
    }
}
