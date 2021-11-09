import {AbstractInterface} from './abstract';
import {Type} from './type';
import {DynamicModuleInterface} from './dynamic-module';
import {ForwardReferenceInterface} from './forward-reference';
import {ProviderType} from "../types";

export interface ModuleMetadata {
    imports?: Array<Type<any> | DynamicModuleInterface | Promise<DynamicModuleInterface> | ForwardReferenceInterface>;

    controllers?: Type<any>[];

    providers?: ProviderType[];

    exports?: Array<DynamicModuleInterface
        | Promise<DynamicModuleInterface>
        | string
        | symbol
        | ProviderType
        | ForwardReferenceInterface
        | AbstractInterface<any>
        | Function>;
}
