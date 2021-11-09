import {Type} from "./type";
import {AbstractInterface} from "./abstract";
import {Scope} from "./scope-options";

export interface ApplicationProviderWrapperInterface {
    moduleKey: string;
    providerKey: string;
    type: string | symbol | Type<any> | AbstractInterface<any> | Function;
    scope?: Scope;
}