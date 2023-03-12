import { ModuleMetadata } from '../contracts/module-metadata.interface';
import { validateModuleKeys } from '../utils';

export function Container(metadata: ModuleMetadata): ClassDecorator {
  const propsKeys = Object.keys(metadata);
  validateModuleKeys(propsKeys);

  return (target: Function) => {
    for (const property in metadata) {
      if (metadata.hasOwnProperty(property)) {
        Reflect.defineMetadata(property, (metadata as any)[property], target);
      }
    }
  };
}
