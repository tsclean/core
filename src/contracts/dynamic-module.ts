import {Type} from './type';
import {ModuleMetadata} from './module-metadata.interface';

export interface DynamicModuleInterface extends ModuleMetadata {

    module: Type<any>;

    global?: boolean;
}
