import {RequestMethod} from "../enums";

export interface ExcludeRouteMetadataInterface {
    path: string;

    pathRegex: RegExp;

    requestMethod: RequestMethod;
}
