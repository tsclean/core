import { RuntimeException } from './runtime';
import { UNKNOWN_DEPENDENCIES_MESSAGE } from '../messages';
import { Module, InjectorDependencyContext } from '../../core';

export class UndefinedDependencyException extends RuntimeException {
  constructor(
    type: string, undefinedDependencyContext: InjectorDependencyContext, module?: Module,
  ) {
    super(
      UNKNOWN_DEPENDENCIES_MESSAGE(type, undefinedDependencyContext, module),
    );
  }
}
