import hash from 'object-hash';
import stringify from 'fast-safe-stringify';

import {randomStringGenerator} from "../../utils";
import {DynamicModuleInterface, Type} from "../../contracts";

export class ModuleTokenFactory {
    private readonly moduleIdsCache = new WeakMap<Type<unknown>, string>();

    public create(
        metaType: Type<unknown>, dynamicModuleMetadata?: Partial<DynamicModuleInterface> | undefined): string {

        const moduleId = this.getModuleId(metaType);
        const opaqueToken = {
            id: moduleId,
            module: this.getModuleName(metaType),
            dynamic: this.getDynamicMetadataToken(dynamicModuleMetadata),
        };
        return hash(opaqueToken, {ignoreUnknown: true});
    }

    public getDynamicMetadataToken(dynamicModuleMetadata: Partial<DynamicModuleInterface> | undefined): string {
        return dynamicModuleMetadata ? stringify(dynamicModuleMetadata, ModuleTokenFactory.replacer) : '';
    }

    public getModuleId(metaType: Type<unknown>): string {
        let moduleId = this.moduleIdsCache.get(metaType);
        if (moduleId) return moduleId;

        moduleId = randomStringGenerator();
        this.moduleIdsCache.set(metaType, moduleId);
        return moduleId;
    }

    public getModuleName(metaType: Type<any>): string {
        return metaType.name;
    }

    private static replacer(key: string, value: any) {
        if (typeof value === 'function') {
            const funcAsString = value.toString();
            const isClass = /^class\s/.test(funcAsString);
            if (isClass) return value.name;

            return hash(funcAsString, {ignoreUnknown: true});
        }
        if (typeof value === 'symbol') return value.toString();

        return value;
    }
}
