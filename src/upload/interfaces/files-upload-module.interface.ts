import { MulterOptions } from './multer-options.interface';
import {ModuleMetadata, Type} from "../../contracts";

// export type MulterModuleOptions = MulterOptions;

export interface MulterOptionsFactory {
  createMulterOptions(): Promise<MulterOptions> | MulterOptions;
}

export interface MulterModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<MulterOptionsFactory>;
  useClass?: Type<MulterOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<MulterOptions> | MulterOptions;
  inject?: any[];
}
