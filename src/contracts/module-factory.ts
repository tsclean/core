import {Type} from "./type";
import {DynamicModuleInterface} from "./dynamic-module";

export interface ModuleFactoryInterface {
    type: Type<any>;
    token: string;
    dynamicMetadata?: Partial<DynamicModuleInterface>;
}