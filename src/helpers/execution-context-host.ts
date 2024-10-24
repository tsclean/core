import {ContextType} from "../types";
import {ExecutionContextInterface, Type, HttpArgumentsHostInterface, WsArgumentsHost} from "../contracts";

export class ExecutionContextHost implements ExecutionContextInterface {
  private contextType = 'http';

  constructor(
    private readonly args: any[],
    private readonly constructorRef: Type<any> = null,
    private readonly handler: Function = null,
  ) {}

  setType<T extends string = ContextType>(type: T) {
    type && (this.contextType = type);
  }

  getType<T extends string = ContextType>(): T {
    return this.contextType as T;
  }

  getClass<T = any>(): Type<T> {
    return this.constructorRef;
  }

  getHandler(): Function {
    return this.handler;
  }

  getArgs<T extends Array<any> = any[]>(): T {
    return this.args as T;
  }

  getArgByIndex<T = any>(index: number): T {
    return this.args[index] as T;
  }

  getHttp(): HttpArgumentsHostInterface {
    return Object.assign(this, {
      getRequest: () => this.getArgByIndex(0),
      getResponse: () => this.getArgByIndex(1),
      getNext: () => this.getArgByIndex(2),
    });
  }

  switchToWs(): WsArgumentsHost {
    return Object.assign(this, {
      getClient: () => this.getArgByIndex(0),
      getData: () => this.getArgByIndex(1),
      getPattern: () => this.getArgByIndex(this.getArgs().length - 1),
    });
  }
}
