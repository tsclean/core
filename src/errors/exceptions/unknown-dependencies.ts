import { RuntimeException } from './runtime';
import { UNKNOWN_DEPENDENCIES_MESSAGE } from '../messages';
import { Module, InjectorDependencyContext } from '../../core';

export class UnknownDependenciesException extends RuntimeException {
  public readonly moduleRef: { id: string } | undefined;

  constructor(
    public readonly type: string | symbol,
    public readonly context: InjectorDependencyContext,
    moduleRef?: Module,
    public readonly metadata?: { id: string },
  ) {
    super(UNKNOWN_DEPENDENCIES_MESSAGE(type, context, moduleRef));
    this.moduleRef = moduleRef && { id: moduleRef.id };
  }
}
