import {ContextId} from "../core";
import {HandlerResponseType} from "../types";
import {ParamProperties} from "../helpers/context-utils";

export interface HandlerMetadataInterface {
    argsLength: number;
    paramTypes: any[];
    httpStatusCode: number;
    responseHeaders: any[];
    hasCustomHeaders: boolean;
    getParamsMetadata: (
        moduleKey: string, contextId?: ContextId, inquirerId?: string) => (ParamProperties & { metaType?: any })[];
    fnHandleResponse: HandlerResponseType;
}