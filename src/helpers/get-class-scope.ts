import {Scope, Type} from "../contracts";
import {SCOPE_OPTIONS_METADATA} from "./constants";

export function getClassScope(provider: Type<unknown>): Scope {
  const metadata = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, provider);
  return metadata && metadata.scope;
}
