import { RuntimeException } from './runtime';

export class UnknownElementException extends RuntimeException {
  constructor(name?: string | symbol) {
    name = name && name.toString();
    super(
      `TSClean could not find ${
        name || 'given'
      } element (this provider does not exist in the current context)`,
    );
  }
}
