import {ModuleTokenFactory} from './module-token-factory';
import {DynamicModuleInterface, ModuleFactoryInterface, Type} from "../../contracts";


export class ModuleCompiler {
    constructor(
        private readonly moduleTokenFactory = new ModuleTokenFactory()
    ) {
    }

    public async compile(metaType: Type<any> | DynamicModuleInterface | Promise<DynamicModuleInterface>): Promise<ModuleFactoryInterface> {
        const {type, dynamicMetadata} = this.extractMetadata(await metaType);
        const token = this.moduleTokenFactory.create(type, dynamicMetadata);
        return {type, dynamicMetadata, token};
    }

    public extractMetadata(metaType: Type<any> | DynamicModuleInterface): {
        type: Type<any>;
        dynamicMetadata?: Partial<DynamicModuleInterface> | undefined;
    } {
        if (!this.isDynamicModule(metaType)) return {type: metaType};
        const {module: type, ...dynamicMetadata} = metaType;
        return {type, dynamicMetadata};
    }

    public isDynamicModule(module: Type<any> | DynamicModuleInterface): module is DynamicModuleInterface {
        return !!(module as DynamicModuleInterface).module;
    }
}
