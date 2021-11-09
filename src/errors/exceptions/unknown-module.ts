import { RuntimeException } from './runtime';

export class UnknownModuleException extends RuntimeException {
  constructor() {
    super(
      'TSClean could not select the given module (it does not exist in current context)',
    );
  }
}
