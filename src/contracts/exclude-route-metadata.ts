import {RequestMethod} from "../enums";

export interface ExcludeRouteMetadataInterface {

    pathRegex: RegExp;

    requestMethod: RequestMethod;
}
