import { Type } from './type'
import { LoggerService, LogLevel } from '../services'
import { DynamicModuleInterface } from './dynamic-module'
import { GetOrResolveOptions } from './application-context-options'

export interface ApplicationContextInterface {
  select<T>(
    module: Type<T> | DynamicModuleInterface
  ): ApplicationContextInterface

  get<T = any, R = T>(typeOrToken: Type<T> | Function | string | symbol): R

  get<T = any, R = T>(
    typeOrToken: Type<T> | Function | string | symbol,
    options: { strict?: boolean; each?: undefined | false }
  ): R

  get<T = any, R = T>(
    typeOrToken: Type<T> | Function | string | symbol,
    options: { strict?: boolean; each: true }
  ): Array<R>

  get<T = any, R = T>(
    typeOrToken: Type<T> | Function | string | symbol,
    options?: GetOrResolveOptions
  ): R | Array<R>

  resolve<T = any, R = T>(
    typeOrToken: Type<T> | Function | string | symbol
  ): Promise<R>

  resolve<T = any, R = T>(
    typeOrToken: Type<T> | Function | string | symbol,
    contextId?: { id: number }
  ): Promise<R>

  resolve<T = any, R = T>(
    typeOrToken: Type<T> | Function | string | symbol,
    contextId?: { id: number },
    options?: { strict?: boolean; each?: undefined | false }
  ): Promise<R>

  resolve<T = any, R = T>(
    typeOrToken: Type<T> | Function | string | symbol,
    contextId?: { id: number },
    options?: { strict?: boolean; each: true }
  ): Promise<Array<R>>

  resolve<T = any, R = T>(
    typeOrToken: Type<T> | Function | string | symbol,
    contextId?: { id: number },
    options?: GetOrResolveOptions
  ): Promise<R | Array<R>>

  registerRequestByContextId<T = any>(
    request: T,
    contextId: { id: number }
  ): void

  close(): Promise<void>

  useLogger(logger: LoggerService | LogLevel[] | false): void

  init(): Promise<this>
}
