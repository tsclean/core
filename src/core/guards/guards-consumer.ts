import { lastValueFrom, Observable } from "rxjs";
import { ExecutionContextHost } from "../../helpers/execution-context-host";
import { ContextType, ControllerType } from "../../types";
import { isEmpty } from "../../utils/shared.utils";
import { CanActivate } from "../../contracts/can-activate";

export class GuardsConsumer {
  public async tryActivate<TContext extends string = ContextType>(
    guards: CanActivate[],
    args: unknown[],
    instance: ControllerType,
    callback: (...args: unknown[]) => unknown,
    type?: TContext,
  ): Promise<boolean> {
    if (!guards || isEmpty(guards)) {
      return true;
    }
    const context = this.createContext(args, instance, callback);
    context.setType<TContext>(type!);

    for (const guard of guards) {
      const result = guard.canActivate(context);
      if (await this.pickResult(result)) {
        continue;
      }
      return false;
    }
    return true;
  }

  public createContext(
    args: unknown[],
    instance: ControllerType,
    callback: (...args: unknown[]) => unknown,
  ): ExecutionContextHost {
    return new ExecutionContextHost(
      args,
      instance.constructor as any,
      callback,
    );
  }

  public async pickResult(
    result: boolean | Promise<boolean> | Observable<boolean>,
  ): Promise<boolean> {
    if (result instanceof Observable) {
      return lastValueFrom(result);
    }
    return result;
  }
}
