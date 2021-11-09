import {RouteInfo} from "./middleware-configuration";

export interface GlobalPrefixOptionsInterface<T = string | RouteInfo> {
  exclude?: T[];
}
