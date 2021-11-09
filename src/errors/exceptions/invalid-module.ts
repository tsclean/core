import { INVALID_MODULE_MESSAGE } from '../messages';
import { RuntimeException } from './runtime';

export class InvalidModuleException extends RuntimeException {
  constructor(parentModule: any, index: number, scope: any[]) {
    super(INVALID_MODULE_MESSAGE(parentModule, index, scope));
  }
}
