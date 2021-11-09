import {ParamType} from "../../types";
import {RouteParamTypes} from "../../enums";

export class ParamsTokenFactory {
  public exchangeEnumForString(type: RouteParamTypes): ParamType {
    switch (type) {
      case RouteParamTypes.BODY:
        return 'body';
      case RouteParamTypes.PARAM:
        return 'param';
      case RouteParamTypes.QUERY:
        return 'query';
      default:
        return 'custom';
    }
  }
}
