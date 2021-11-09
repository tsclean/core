import {RouteParamTypes} from "../enums";
import {ParamData} from "../decorators";
import {HandlerTransform} from "./handler-transform";

export interface ParamPropertiesInterface {
    index: number;
    type: RouteParamTypes | string;
    data: ParamData;
    handlers: HandlerTransform[];
    extractValue: <T, R>(req: T, res: R, next: Function) => any;
}