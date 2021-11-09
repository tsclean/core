import { ContextId } from '../core';
import { ParamProperties } from '../helpers/context-utils';

type ParamPropertiesWithMetaType<T = any> = ParamProperties & { metaType?: T };

export interface ExternalHandlerMetadataInterface {
  argsLength: number;
  paramTypes: any[];
  getParamsMetadata: (
    moduleKey: string, contextId?: ContextId, inquirerId?: string) => ParamPropertiesWithMetaType[];
}
