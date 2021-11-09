import {RequestMethod} from "../enums";
import {RouterProxyCallback} from "../router/router-proxy";

export interface RouteDefinitionInterface {
    path: string[];
    requestMethod: RequestMethod;
    targetCallback: RouterProxyCallback;
    methodName: string;
    version?: string;
}