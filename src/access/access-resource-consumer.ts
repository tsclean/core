import {isEmpty} from "../utils";
import {ContextType, ControllerType} from "../types";
import {ExecutionContextHost} from '../helpers';
import {AccessResourceInterface} from "../contracts";

export class AccessResourceConsumer {

    public async tryAccess<T extends string = ContextType>(
        resources: AccessResourceInterface[], args: unknown[], instance: ControllerType,
        callback: (...args: unknown[]) => unknown, type?: T): Promise<boolean> {

        if (!resources || isEmpty(resources)) return true;

        const context = this.createContext(args, instance, callback);
        context.setType<T>(type);

        for (const resource of resources) {
            const result = resource.accessResource(context);
            if (await this.pickResult(result)) continue;

            return false;
        }
        return true;
    }

    public createContext(
        args: unknown[], instance: ControllerType, callback: (...args: unknown[]) => unknown,): ExecutionContextHost {
        return new ExecutionContextHost(args, instance.constructor as any, callback);
    }

    public async pickResult(result: boolean | Promise<boolean>): Promise<boolean> {
        return result;
    }
}
