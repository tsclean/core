import {ContextType} from "../types";

export interface HttpArgumentsHostInterface {
  getRequest<T = any>(): T;
  getResponse<T = any>(): T;
  getNext<T = any>(): T;
}

export interface ArgumentsHostInterface {
  getArgs<T extends Array<any> = any[]>(): T;
  getArgByIndex<T = any>(index: number): T;
  getHttp(): HttpArgumentsHostInterface;
  getType<T extends string = ContextType>(): T;
}
