import {AbstractInterface, Type} from "../contracts";

export type InstanceTokenType =
    | string
    | symbol
    | Type<any>
    | AbstractInterface<any>
    | Function;