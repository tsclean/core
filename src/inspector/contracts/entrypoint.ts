import { RequestMethod } from "../../enums";

export type HttpEntrypointMetadata = {
    path: string;
    requestMethod: keyof typeof RequestMethod;
  };
  
  export type MiddlewareEntrypointMetadata = {
    path: string;
    requestMethod: keyof typeof RequestMethod;
  };
  
  export type Entrypoint<T> = {
    id?: string;
    type: string;
    methodName: string;
    className: string;
    classNodeId: string;
    metadata: { key: string } & T;
  };