import { RuntimeException } from './runtime';
import { UNKNOWN_DEPENDENCIES_MESSAGE } from '../messages';
import { Module, InjectorDependencyContext } from '../../core';

export class UnknownDependenciesException extends RuntimeException {
  constructor(
    type: string | symbol, unknownDependencyContext: InjectorDependencyContext, module?: Module,
  ) {
    super(UNKNOWN_DEPENDENCIES_MESSAGE(type, unknownDependencyContext, module));
  }
}
