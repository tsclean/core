import { RequestMethod } from "../enums";

export interface ExcludeRouteMetadata {
  path: string;
  pathRegex: RegExp;
  requestMethod: RequestMethod;
}
