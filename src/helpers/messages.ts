import {RequestMethod} from "../enums";

export const MODULE_INIT_MESSAGE = (text: TemplateStringsArray, module: string) =>
    `${module} dependencies initialized`;

export const ROUTE_MAPPED_MESSAGE = (path: string, method: string | number) =>
    `Route available {${path}, ${RequestMethod[method]}}`;

export const CONTROLLER_MAPPING_MESSAGE = (name: string, path: string) =>
    `${name} {${path}}:`;

