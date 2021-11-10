import {
    InjectorDependency,
    InjectorDependencyContext,
    Module
} from '../core';
import {ForwardReferenceInterface, Type} from "../contracts";
import {isNil, isSymbol} from "../utils";

const getInstanceName = (instance: unknown): string => {
    if ((instance as ForwardReferenceInterface)?.forwardRef) {
        return (instance as ForwardReferenceInterface).forwardRef()?.name;
    }
    return (instance as Type<any>)?.name;
};

const getDependencyName = (dependency: InjectorDependency): string =>
    getInstanceName(dependency) || (isSymbol(dependency) && dependency.toString()) ||
    (dependency as string) || '+';

const getModuleName = (module: Module) => (module && getInstanceName(module.metaType)) || 'current';

const stringifyScope = (scope: any[]): string => (scope || []).map(getInstanceName).join(' -> ');

export const UNKNOWN_DEPENDENCIES_MESSAGE = (
    type: string | symbol, unknownDependencyContext: InjectorDependencyContext, module: Module) => {
    const {
        index,
        name = 'dependency',
        dependencies,
        key,
    } = unknownDependencyContext;
    const moduleName = getModuleName(module) || 'Module';
    const dependencyName = getDependencyName(name);

    let message = `TSClean can't resolve dependencies of the ${type.toString()}`;

    const potentialSolutions = `\n
Potential solutions:
- If ${dependencyName} is a constant that you must include in the file src/infrastructure/driven-adapters/providers/index.ts  
  export const adapters = [
    {
        provide: ${dependencyName},
        useClass: ClassAdapter
    },
  ]
`;

    if (isNil(index)) {
        message += `. Please make sure that the "${key.toString()}" property is available in the current context.${potentialSolutions}`;
        return message;
    }
    const dependenciesName = (dependencies || []).map(getDependencyName);
    dependenciesName[index] = '?';

    message += ` (`;
    message += dependenciesName.join(', ');
    message += `). Please make sure that the argument ${dependencyName} at index [${index}] is available in the ${getModuleName(
        module,
    )} context.`;
    message += potentialSolutions;

    return message;
};

export const INVALID_MIDDLEWARE_MESSAGE = (text: TemplateStringsArray, name: string) =>
    `The middleware doesn't provide the 'use' method (${name})`;

export const UNDEFINED_FORWARD_REF_MESSAGE = (scope: Type<any>[]) =>
    `TSClean cannot create the module instance. Often, this is because of a circular dependency between modules. Use forwardRef() to avoid it.
Scope [${stringifyScope(scope)}]
  `;

export const INVALID_MODULE_MESSAGE = (
    parentModule: any, index: number, scope: any[]) => {
    const parentModuleName = parentModule?.name || 'module';

    return `TSClean cannot create the ${parentModuleName} instance.
Received an unexpected value at index [${index}] of the ${parentModuleName} "imports" array. 

Scope [${stringifyScope(scope)}]`;
};

export const UNDEFINED_MODULE_MESSAGE = (parentModule: any, index: number, scope: any[]) => {
    const parentModuleName = parentModule?.name || 'module';

    return `TSClean cannot create the ${parentModuleName} instance.
The module at index [${index}] of the ${parentModuleName} "imports" array is undefined.

Potential causes:
- The module at index [${index}] is of type "undefined". Check your import statements and the type of the module.

Scope [${stringifyScope(scope)}]`;
};

export const UNKNOWN_EXPORT_MESSAGE = (token: string | symbol = 'item', module: string) => {
    token = isSymbol(token) ? token.toString() : token;

    return `TSClean cannot export a provider/module that is not a part of the currently processed module (${module}). Please verify whether the exported ${token} is available in this particular context.

Possible Solutions:
- Is ${token} part of the relevant providers/imports within ${module}?
`;
};

export const INVALID_CLASS_MESSAGE = (text: TemplateStringsArray, value: any) =>
    `ModuleRef cannot instantiate class (${value} is not constructable).`;

export const INVALID_CLASS_SCOPE_MESSAGE = (text: TemplateStringsArray, name: string | undefined) =>
    `${
        name || 'This class'
    } is marked as a scoped provider. Request and transient-scoped providers can't be used in combination with "get()" method. Please, use "resolve()" instead.`;

export const INVALID_MIDDLEWARE_CONFIGURATION = `An invalid middleware configuration has been passed inside the module 'configure()' method.`;
export const UNKNOWN_REQUEST_MAPPING = `An invalid controller has been detected. Perhaps, one of your controllers is missing @Mapping() decorator.`;
export const INVALID_EXCEPTION_FILTER = `Invalid exception filters (@UseFilters()).`;
