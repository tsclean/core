import {Type} from "../contracts";
import {ClassProvider, ExistingProvider, FactoryProvider, ValueProvider} from "../contracts/provider";

export type ProviderType<T = any> =
    | Type<any>
    | ClassProvider<T>
    | ValueProvider<T>
    | FactoryProvider<T>
    | ExistingProvider<T>;